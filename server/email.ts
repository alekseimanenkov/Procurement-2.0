
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendLaneNotification(emails: string[], lane: any) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    bcc: emails,
    subject: `New Lane Published: ${lane.bidName}`,
    html: `
      <h2>New Lane Available for Bidding</h2>
      <p>A new lane has been published:</p>
      <ul>
        <li><strong>Bid Name:</strong> ${lane.bidName}</li>
        <li><strong>Vehicle Type:</strong> ${lane.vehicleType}</li>
        <li><strong>Loading Location:</strong> ${lane.loadingLocation}</li>
        <li><strong>Unloading Location:</strong> ${lane.unloadingLocation}</li>
        <li><strong>Valid From:</strong> ${new Date(lane.validFrom).toLocaleString()}</li>
        <li><strong>Valid Until:</strong> ${new Date(lane.validUntil).toLocaleString()}</li>
      </ul>
      <p>Log in to the platform to submit your bid.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
