import nodemailer from "nodemailer";

let transporter;
export const emailEnabled = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
}

export async function sendReminderEmail({ to, name, title, company, role }) {
  if (!emailEnabled()) return { skipped: true };
  const clientUrl = (process.env.CLIENT_URL || "").split(",")[0];
  await getTransporter().sendMail({
    from: `"Jobtrail" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Reminder: ${title}`,
    text: `Hi ${name},\n\n${title}\n\nApplication: ${role} at ${company}\n\nOpen Jobtrail: ${clientUrl}/reminders\n`,
  });
  return { sent: true };
}
