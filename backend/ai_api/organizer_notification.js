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
 * MAIL SENDER
 * ================================
 */
const sendEmail = async (to, subject, eventName, photographerName, dashboardUrl) => {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const mailOptions = {
        from: `"Event Management Company" <${SMTP_CONFIG.auth.user}>`,
        to,
        subject,
        text: `The photographer ${photographerName} has completed uploading photos for ${eventName}. You can now review the photos and start face clustering at ${dashboardUrl}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .email-wrapper { background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px; text-align: center; }
                    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
                    .content { padding: 40px 32px; color: #334155; line-height: 1.6; }
                    .content h2 { margin-top: 0; color: #1e293b; font-size: 20px; font-weight: 700; }
                    .event-card { background-color: #ecfdf5; border-left: 4px solid #059669; padding: 24px; margin: 24px 0; border-radius: 4px; }
                    .event-name { font-size: 18px; font-weight: 700; color: #1e293b; display: block; margin-bottom: 4px; }
                    .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 24px 0; border-radius: 6px; }
                    .info-item { display: flex; align-items: center; margin-bottom: 12px; }
                    .info-item:last-child { margin-bottom: 0; }
                    .info-label { font-weight: 600; color: #64748b; min-width: 120px; }
                    .info-value { color: #1e293b; }
                    .next-steps { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 4px; }
                    .next-steps h3 { margin-top: 0; color: #1e40af; font-size: 16px; }
                    .next-steps ul { margin: 12px 0; padding-left: 20px; }
                    .next-steps li { margin-bottom: 8px; color: #334155; }
                    .btn-container { text-align: center; margin-top: 32px; margin-bottom: 16px; }
                    .btn { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
                    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="email-wrapper">
                        <div class="header">
                            <h1>✓ Upload Complete</h1>
                        </div>
                        
                        <div class="content">
                            <p>Hello,</p>
                            <p>Great news! The photographer has completed uploading photos for your event.</p>
                            
                            <div class="event-card">
                                <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">Event Details</span>
                                <span class="event-name">${eventName}</span>
                            </div>

                            <div class="info-box">
                                <div class="info-item">
                                    <span class="info-label">Photographer:</span>
                                    <span class="info-value">${photographerName}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Status:</span>
                                    <span class="info-value" style="color: #059669; font-weight: 600;">Upload Complete</span>
                                </div>
                            </div>

                            <div class="next-steps">
                                <h3>📋 Next Steps</h3>
                                <ul>
                                    <li><strong>Review Photos:</strong> Check the uploaded photos for quality and completeness</li>
                                    <li><strong>Start Face Clustering:</strong> Begin the AI-powered face recognition and clustering process</li>
                                    <li><strong>Notify Attendees:</strong> Once clustering is complete, attendees can access their photos</li>
                                </ul>
                            </div>

                            <div class="btn-container">
                                <a href="${dashboardUrl}" class="btn">Open Organizer Dashboard</a>
                            </div>
                            
                            <p style="font-size: 14px; color: #64748b; margin-top: 32px;">
                                You can access your organizer dashboard to review the photos and manage the event.
                            </p>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>© 2026 Event Management Company. All rights reserved.</p>
                        <p>This is an automated system message. Please do not reply directly to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Organizer notification sent:', info.messageId);
        return true;
    } catch (err) {
        console.error('❌ Organizer notification failed:', err.message);
        return false;
    }
};

/**
 * ================================
 * CLI ENTRY POINT
 * ================================
 */
const args = process.argv.slice(2);

if (args.length < 5) {
    console.error('Usage: node organizer_notification.js <to> <subject> <event_name> <photographer_name> <dashboard_url>');
    process.exit(1);
}

const [to, subject, eventName, photographerName, dashboardUrl] = args;

(async () => {
    const success = await sendEmail(to, subject, eventName, photographerName, dashboardUrl);
    process.exit(success ? 0 : 1);
})();
