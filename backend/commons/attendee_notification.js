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
 * ATTENDEE MAIL SENDER
 * ================================
 */
const sendAttendeeNotification = async (to, attendeeName, eventName, dashboardUrl, hasMatches) => {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const isMatch = hasMatches === 'true';

    const subjectText = isMatch
        ? `Your Photos from ${eventName} are Ready!`
        : `Processing Complete for ${eventName}`;

    const previewText = isMatch
        ? `Hello ${attendeeName}! Great news! Your personal collection from the event "${eventName}" is now available. View your photos here: ${dashboardUrl}`
        : `Hello ${attendeeName}! The AI Vision system has finished analyzing all photos for "${eventName}". View the full event gallery here: ${dashboardUrl}`;

    const headerBadge = isMatch ? 'Memories Found' : 'Processing Complete';
    const headerTitle = isMatch ? 'Your Gallery is Ready' : 'Event Gallery Ready';

    const bodyText = isMatch
        ? `Excellent news! The AI Vision system has finished analyzing all photos for <strong style="color: #4f46e5;">${eventName}</strong> and identified your personal moments.`
        : `The AI Vision system has finished analyzing all photos for <strong style="color: #4f46e5;">${eventName}</strong>. While we didn't identify any direct matches of you, the full event gallery is now available to view!`;

    const cardCategory = isMatch ? 'Private Gallery' : 'Event Gallery';
    const cardDescription = isMatch
        ? `Your secure dashboard is now populated with photos where you've been identified.`
        : `You can browse all public photos from the event in the main gallery.`;

    const buttonText = isMatch ? 'View My Photos' : 'View Event Gallery';

    const mailOptions = {
        from: `"Event Management Company" <${SMTP_CONFIG.auth.user}>`,
        to,
        subject: subjectText,
        text: previewText,
        html: `
            <div style="background-color: #f1f5f9; padding: 60px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
                    
                    <!-- Premium Header -->
                    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 50px 40px; text-align: center;">
                        <div style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); display: inline-block; padding: 8px 20px; border-radius: 100px; border: 1px solid rgba(255, 255, 255, 0.3); margin-bottom: 24px;">
                            <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">${headerBadge}</span>
                        </div>
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                            ${headerTitle}
                        </h1>
                    </div>

                    <div style="padding: 40px;">
                        <h2 style="margin-top: 0; font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 20px;">Hello ${attendeeName},</h2>
                        <p style="margin-bottom: 24px; font-size: 16px; color: #64748b;">
                            ${bodyText}
                        </p>
                        
                        <!-- Details Card -->
                        <div style="background-color: #f8fafc; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 40px; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">${cardCategory}</p>
                            <p style="margin: 0; font-size: 16px; color: #334155; font-weight: 500;">${cardDescription}</p>
                        </div>

                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff !important; padding: 18px 40px; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">
                                ${buttonText}
                            </a>
                        </div>

                        <p style="margin-top: 35px; font-size: 14px; color: #94a3b8; text-align: center;">
                            Having trouble with the button? Copy and paste this link:<br>
                            <a href="${dashboardUrl}" style="color: #4f46e5; text-decoration: none; word-break: break-all; font-weight: 500;">${dashboardUrl}</a>
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
        console.log('✅ Attendee notification sent:', info.messageId);
        return true;
    } catch (err) {
        console.error('❌ Attendee notification failed:', err.message);
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
    console.error('Usage: node attendee_notification.js <to> <attendee_name> <event_name> <dashboard_url> <hasMatches>');
    process.exit(1);
}

const [to, attendeeName, eventName, dashboardUrl, hasMatches] = args;

(async () => {
    const success = await sendAttendeeNotification(to, attendeeName, eventName, dashboardUrl, hasMatches);
    process.exit(success ? 0 : 1);
})();
