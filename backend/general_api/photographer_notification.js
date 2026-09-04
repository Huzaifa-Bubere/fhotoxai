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

async function sendPhotographerInvitation(to, subject, eventName, eventLink) {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const mailOptions = {
        from: `"Event Management Company" <${SMTP_CONFIG.auth.user}>`,
        to,
        subject,
        text: `You have been invited as a photographer for ${eventName}. Access your photographer portal here: ${eventLink}`,
        html: `
            <div style="background-color: #f8fafc; padding: 40px 20px; font-family: Arial, sans-serif; color: #334155;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);">
                    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 36px 24px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 26px;">Photographer Invitation</h1>
                    </div>
                    <div style="padding: 32px 28px;">
                        <p style="margin-top: 0; font-size: 16px;">Hello,</p>
                        <p style="font-size: 15px; line-height: 1.7;">
                            You have been invited to work as a photographer for <strong>${eventName}</strong>.
                        </p>
                        <div style="background: #f1f5f9; border-left: 4px solid #2563eb; padding: 20px; border-radius: 10px; margin: 24px 0;">
                            <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Assignment</div>
                            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${eventName}</div>
                        </div>
                        <p style="font-size: 15px; line-height: 1.7;">
                            Use the secure link below to open your portal, sign in, and upload event photos.
                        </p>
                        <div style="text-align: center; margin: 28px 0;">
                            <a href="${eventLink}" style="display: inline-block; padding: 14px 28px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">
                                Open Photographer Portal
                            </a>
                        </div>
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
                            If the button does not open, use this link:<br>
                            <a href="${eventLink}" style="color: #2563eb; word-break: break-all;">${eventLink}</a>
                        </p>
                    </div>
                    <div style="background: #0f172a; color: #94a3b8; text-align: center; padding: 22px 20px; font-size: 12px;">
                        Event Management Company
                    </div>
                </div>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Photographer invitation sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`Photographer invitation failed: ${error?.message || error}`);
        return false;
    }
}

const isMainModule = process.argv[1] && process.argv[1].endsWith('photographer_notification.js');
if (isMainModule) {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.error('Usage: node photographer_notification.js <to> <subject> <event_name> <event_link>');
        process.exit(1);
    }

    const [to, subject, eventName, eventLink] = args;
    sendPhotographerInvitation(to, subject, eventName, eventLink)
        .then((success) => process.exit(success ? 0 : 1))
        .catch(() => process.exit(1));
}

export default sendPhotographerInvitation;
