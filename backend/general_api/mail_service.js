import nodemailer from 'nodemailer';

const SMTP_CONFIG = {
    host: process.env.SMTP_SERVER || 'mail.digitalnexusai.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
        user: process.env.MAIL_USERNAME || 'admissions@digitalnexusai.com',
        pass: process.env.MAIL_PASSWORD || 'Nanite12#',
    },
};

const sendEmail = async (to, subject, code) => {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const mailOptions = {
        from: `"Event Management Company" <${SMTP_CONFIG.auth.user}>`,
        to,
        subject,
        text: `Your authentication code is: ${code}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #1a7f37;">Authentication Code</h2>
                <p>Hello,</p>
                <p>Your authentication code for the Event Management Company portal is:</p>
                <h1 style="color: #1a7f37; font-size: 32px; letter-spacing: 6px;">${code}</h1>
                <p style="color: #666; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">If you did not request this, you can safely ignore this email.</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error(`Email send failed: ${err?.message || err}`);
        return false;
    }
};

const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node mail_service.js <to> <subject> <code>');
    process.exit(1);
}

const [to, subject, code] = args;

(async () => {
    const success = await sendEmail(to, subject, code);
    process.exit(success ? 0 : 1);
})();
