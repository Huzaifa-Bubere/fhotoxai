import nodemailer from 'nodemailer';

/**
 * ================================
 * HARD-CODED SMTP CONFIG
 * ================================
 */
const SMTP_CONFIG = {
    host: 'mail.digitalnexusai.com',
    port: 587,
    secure: false,
    auth: {
        user: 'admissions@digitalnexusai.com',
        pass: 'Nanite12#',
    },
};

/**
 * ================================
 * ATTENDEE REGISTRATION MAIL SENDER
 * ================================
 */
const sendRegistrationEmail = async (to, attendeeName, eventName, loginUrl) => {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const mailOptions = {
        from: `"Event Management Company" <${SMTP_CONFIG.auth.user}>`,
        to,
        subject: `Registration Confirmed: ${eventName}`,
        text: `Hello ${attendeeName}! You have been successfully registered for "${eventName}". Access your dashboard here: ${loginUrl}\n\n📸 Did you know? You can also upload your own photos directly to the shared event gallery!`,
        html: `
            <div style="background-color: #f1f5f9; padding: 60px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
                    
                    <!-- Premium Header -->
                    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 50px 40px; text-align: center;">
                        <div style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); display: inline-block; padding: 8px 20px; border-radius: 100px; border: 1px solid rgba(255, 255, 255, 0.3); margin-bottom: 24px;">
                            <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Registration Complete</span>
                        </div>
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                            You're In!
                        </h1>
                    </div>

                    <div style="padding: 40px;">
                        <h2 style="margin-top: 0; font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 20px;">Hello ${attendeeName},</h2>
                        <p style="margin-bottom: 24px; font-size: 16px; color: #64748b;">
                            You have been successfully registered for <strong style="color: #059669;">${eventName}</strong>. We are thrilled to have you with us.
                        </p>
                        
                        <!-- Details Card -->
                        <div style="background-color: #f8fafc; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 40px; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Next Steps</p>
                            <p style="margin: 0; font-size: 16px; color: #334155; font-weight: 500; margin-bottom: 16px;">Access your attendee dashboard to view event details and your personal gallery once it's ready.</p>
                            <p style="margin: 0; font-size: 15px; background: #ECFDF5; color: #059669; padding: 12px 20px; border-radius: 12px; font-weight: 600; display: inline-block;">📸 Did you know? You can also upload your own photos to the shared event gallery!</p>
                        </div>

                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${loginUrl}" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; padding: 18px 40px; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.3);">
                                Access Dashboard
                            </a>
                        </div>

                        <p style="margin-top: 35px; font-size: 14px; color: #94a3b8; text-align: center;">
                            Having trouble with the button? Copy and paste this link:<br>
                            <a href="${loginUrl}" style="color: #059669; text-decoration: none; word-break: break-all; font-weight: 500;">${loginUrl}</a>
                        </p>
                    </div>

                    <!-- Modern Footer -->
                    <div style="background-color: #0f172a; padding: 40px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #94a3b8; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">Event Management Company</p>
                        <div style="height: 1px; background: rgba(255,255,255,0.1); width: 80px; margin: 0 auto 20px;"></div>
                        <p style="margin: 0; font-size: 12px; color: #475569;">
                            &copy; ${new Date().getFullYear()} Event Management Company. Professional intelligence for professional events.
                        </p>
                    </div>
                </div>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Registration email sent:', info.messageId);
        return true;
    } catch (err) {
        console.error('❌ Registration email failed:', err.message);
        return false;
    }
};

/**
 * ================================
 * CLI ENTRY POINT
 * ================================
 */
const args = process.argv.slice(2);

if (args.length < 4) {
    console.error('Usage: node attendee_registration_email.js <to> <attendee_name> <event_name> <login_url>');
    process.exit(1);
}

const [to, attendeeName, eventName, loginUrl] = args;

(async () => {
    const success = await sendRegistrationEmail(to, attendeeName, eventName, loginUrl);
    process.exit(success ? 0 : 1);
})();
