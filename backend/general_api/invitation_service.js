import fs from 'fs';
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

async function sendInvitation(to, subject, eventName, registrationUrl, qrCodePath) {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const attachments = [];
    let qrSection = '';

    if (qrCodePath && fs.existsSync(qrCodePath)) {
        attachments.push({
            filename: 'event-qr.png',
            path: qrCodePath,
            cid: 'event-qr-code',
        });

        qrSection = `
            <div style="margin: 28px 0; padding: 22px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; text-align: center;">
                <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #166534; margin-bottom: 12px;">QR Access</div>
                <img src="cid:event-qr-code" alt="Event QR code" style="max-width: 180px; width: 100%; height: auto; display: block; margin: 0 auto 12px;" />
                <div style="font-size: 13px; color: #166534;">You can also use this QR code for quick event access.</div>
            </div>
        `;
    }

    const mailOptions = {
        from: `"Event Management Company" <${SMTP_CONFIG.auth.user}>`,
        to,
        subject,
        text: `You are invited to ${eventName}. Complete your access here: ${registrationUrl}`,
        html: `
            <div style="background-color: #f8fafc; padding: 40px 20px; font-family: Arial, sans-serif; color: #334155;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 22px; overflow: hidden; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 38px 24px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Event Invitation</h1>
                        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.92); font-size: 15px;">Your access is ready</p>
                    </div>
                    <div style="padding: 34px 28px;">
                        <p style="margin-top: 0; font-size: 16px;">Hello,</p>
                        <p style="font-size: 15px; line-height: 1.75;">
                            You have been invited to <strong>${eventName}</strong>. Use the secure link below to complete your access and reach your attendee portal.
                        </p>
                        <div style="background: #eff6ff; border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 10px; margin: 24px 0;">
                            <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #0369a1; margin-bottom: 8px;">Invitation</div>
                            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${eventName}</div>
                        </div>
                        <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 18px 20px; border-radius: 12px; margin-bottom: 24px;">
                            <div style="font-size: 14px; color: #92400e;">
                                After registration, the system can match your event photos and show them in your private attendee view.
                            </div>
                        </div>
                        ${qrSection}
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${registrationUrl}" style="display: inline-block; padding: 15px 30px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">
                                Open Event Access
                            </a>
                        </div>
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
                            If the button does not open, use this link:<br>
                            <a href="${registrationUrl}" style="color: #10b981; word-break: break-all;">${registrationUrl}</a>
                        </p>
                    </div>
                    <div style="background: #0f172a; color: #94a3b8; text-align: center; padding: 22px 20px; font-size: 12px;">
                        Event Management Company
                    </div>
                </div>
            </div>
        `,
        attachments,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Guest invitation sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`Guest invitation failed: ${error?.message || error}`);
        return false;
    }
}

const isMainModule = process.argv[1] && process.argv[1].endsWith('invitation_service.js');
if (isMainModule) {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.error('Usage: node invitation_service.js <to> <subject> <event_name> <registration_url> [qr_code_path]');
        process.exit(1);
    }

    const [to, subject, eventName, registrationUrl, qrCodePath] = args;
    sendInvitation(to, subject, eventName, registrationUrl, qrCodePath)
        .then((success) => process.exit(success ? 0 : 1))
        .catch(() => process.exit(1));
}

export default sendInvitation;
