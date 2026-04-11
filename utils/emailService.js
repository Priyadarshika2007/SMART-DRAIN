import nodemailer from 'nodemailer';

function getEmailCredentials() {
  return {
    user: String(process.env.EMAIL_USER || '').trim(),
    pass: String(process.env.EMAIL_PASS || '').trim(),
  };
}

function createGmailTransporter() {
  const { user, pass } = getEmailCredentials();

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
}

export async function sendAlertEmail(alert) {
  try {
    const { user: sender, pass: password } = getEmailCredentials();
    const receiver = String(alert?.email || '').trim();

    if (!sender || !password) {
      console.warn('[EMAIL] EMAIL_USER or EMAIL_PASS is not configured. Skipping email send.');
      return false;
    }

    if (!receiver) {
      console.warn('[EMAIL] Receiver email is missing. Skipping email send.');
      return false;
    }

    console.log('[EMAIL] Sending email to:', receiver);
    console.log('[EMAIL] Using sender:', sender);

    const transporter = createGmailTransporter();

    try {
      await transporter.verify();
      console.log('[EMAIL] SMTP Server Ready');
    } catch (smtpError) {
      console.error('[EMAIL] SMTP Error:', smtpError);
      return false;
    }

    await transporter.sendMail({
      from: `"UrbanDrainX Alert" <${sender}>`,
      to: receiver,
      subject: `Urgent: Flood Risk in ${alert?.area || 'your area'}`,
      html: `
        <h2 style="color:red;">Critical Alert Detected</h2>
        <p><b>Drain ID:</b> ${alert?.drainId ?? '-'}</p>
        <p><b>Area:</b> ${alert?.area || '-'}</p>
        <p><b>DHI Score:</b> ${alert?.dhi ?? '-'}</p>
        <p><b>Status:</b> ${alert?.status || '-'}</p>
        <p><b>Time:</b> ${new Date().toLocaleString()}</p>
      `,
    });

    console.log('[EMAIL] Email sent successfully');
    return true;
  } catch (err) {
    console.error('[EMAIL] Email failed:', err);
    return false;
  }
}

export default sendAlertEmail;
