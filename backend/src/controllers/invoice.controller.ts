import { Request, Response } from 'express';
import { prisma } from '../index';
import PdfPrinter from 'pdfmake';
import fs from 'fs';
import path from 'path';

// Define font files for pdfmake
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { customerId, products, services, discount } = req.body;

    if (!customerId) return res.status(400).json({ message: 'customerId is required' });

    let totalAmount = 0;
    
    // In a real app, you would fetch prices from DB to avoid client-side spoofing.
    // Assuming products and services array looks like: [{ description: 'Item 1', amount: 100 }]
    if (products && Array.isArray(products)) {
      products.forEach(p => totalAmount += p.amount);
    }
    if (services && Array.isArray(services)) {
      services.forEach(s => totalAmount += s.amount);
    }

    const discountAmount = discount || 0;
    const subtotal = totalAmount - discountAmount;
    
    // 18% GST calculation (9% CGST, 9% SGST)
    const gstAmount = subtotal * 0.18;
    const finalAmount = subtotal + gstAmount;

    const invoiceNumber = `INV-${Date.now()}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        totalAmount: finalAmount,
        gstAmount,
        discount: discountAmount,
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const generatePdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: { include: { user: true } }
      }
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const docDefinition: any = {
      content: [
        { text: 'Pratham Enterprises', style: 'header' },
        { text: 'Tax Invoice', style: 'subheader' },
        { text: `Invoice Number: ${invoice.invoiceNumber}` },
        { text: `Date: ${new Date(invoice.createdAt).toLocaleDateString()}` },
        { text: `GSTIN: 27AAAAA0000A1Z5\n\n` },
        { text: 'Bill To:', style: 'subheader' },
        { text: `Name: ${invoice.customer?.user?.name || 'N/A'}` },
        { text: `Address: ${invoice.customer?.address || 'N/A'}\n\n` },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto'],
            body: [
              ['Description', 'Amount'],
              ['Service & Products Charge', `₹ ${invoice.totalAmount - invoice.gstAmount + invoice.discount}`],
              ['Discount', `- ₹ ${invoice.discount}`],
              ['Subtotal', `₹ ${invoice.totalAmount - invoice.gstAmount}`],
              ['GST (18%)', `₹ ${invoice.gstAmount.toFixed(2)}`],
              [{ text: 'Total', bold: true }, { text: `₹ ${invoice.totalAmount.toFixed(2)}`, bold: true }]
            ]
          }
        }
      ],
      styles: {
        header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, `${invoice.invoiceNumber}.pdf`);
    const stream = fs.createWriteStream(filePath);
    pdfDoc.pipe(stream);
    pdfDoc.end();

    stream.on('finish', async () => {
      // Update DB with PDF URL
      const pdfUrl = `/uploads/${invoice.invoiceNumber}.pdf`;
      await prisma.invoice.update({
        where: { id },
        data: { pdfUrl }
      });
      
      res.json({ message: 'PDF generated successfully', pdfUrl });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInvoices = async (req: Request | any, res: Response) => {
  try {
    const user = req.user;
    let whereClause = {};

    if (user.role === 'CUSTOMER') {
      const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
      whereClause = { customerId: profile?.customerId };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: { include: { user: { select: { name: true, phone: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
