/**
 * event_creation_notification.js
 * Sends an email confirming the successful creation of a new event.
 */

import nodemailer from 'nodemailer';

const SMTP_CONFIG = {
    host: 'mail.digitalnexusai.com',
    port: 587,
    secure: false,
    auth: {
        user: 'admissions@digitalnexusai.com',
        pass: 'Nanite12#',
    },
};

async function sendEventCreationNotification(recipientEmail, eventName, date, time, location, dashboardUrl) {
    // Determine the environment and construct the base URL dynamically if not provided
    const isProd = process.env.NODE_ENV === 'production';
    const protocol = isProd ? 'https' : 'http';
    const host = process.env.FRONTEND_DOMAIN || (isProd ? 'events.digitalnexusai.com' : 'localhost:5173');
    const baseUrl = `${protocol}://${host}`;

    // Default dashboard URL if not explicitly provided
    const finalDashboardUrl = dashboardUrl || `${baseUrl}/organizer/dashboard`;

    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const currentYear = new Date().getFullYear();

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
                margin: 0; 
                padding: 0; 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f8fafc;
                color: #334155;
            }
        </style>
    </head>
    <body>
        <div style="background-color: #f8fafc; padding: 40px 20px; min-height: 100vh;">
            <div style="max-width: 600px; margin: 0 auto;">
                
                <!-- Email Container -->
                <div style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);">
                    
                    <!-- Gradient Header Card -->
                    <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                            <span style="font-size: 32px; vertical-align: middle; margin-right: 10px;">🎉</span> Event Scheduled Successfully!
                        </h1>
                        <p style="color: rgba(255,255,255,0.9); margin-top: 12px; font-size: 16px; font-weight: 500;">Your new event is ready to go.</p>
                    </div>

                    <div style="padding: 40px;">
                        <h2 style="margin-top: 0; font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 20px;">Hello,</h2>
                        <p style="margin-bottom: 28px; font-size: 16px; color: #475569; line-height: 1.6;">
                            Congratulations! Your event <strong style="color: #0d9488;">${eventName}</strong> has been successfully set up in our system. 
                            You can now start managing guests, assigning photographers, and overseeing your event gallery.
                        </p>

                        <!-- Event Logistics Box -->
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin-bottom: 30px;">
                            <h3 style="margin-top: 0; font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Event Details</h3>
                            
                            <div style="margin-bottom: 15px;">
                                <div style="font-size: 13px; color: #94a3b8; font-weight: 600; margin-bottom: 4px;">Date & Time</div>
                                <div style="font-size: 16px; color: #1e293b; font-weight: 600;">${date} at ${time}</div>
                            </div>

                            <div>
                                <div style="font-size: 13px; color: #94a3b8; font-weight: 600; margin-bottom: 4px;">Venue / Location</div>
                                <div style="font-size: 16px; color: #1e293b; font-weight: 600;">${location}</div>
                            </div>
                        </div>

                        <!-- Next Steps Box -->
                        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 25px; margin-bottom: 35px;">
                            <h3 style="margin-top: 0; font-size: 16px; font-weight: 700; color: #166534; margin-bottom: 15px;">Next steps to prepare:</h3>
                            <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 15px; line-height: 1.8;">
                                <li>Send digital invitations to your attendees</li>
                                <li>Download and print your Event QR Poster</li>
                                <li>Coordinate with your assigned photographer</li>
                            </ul>
                        </div>

                        <!-- Action Button -->
                        <div style="text-align: center; margin-bottom: 20px;">
                            <a href="${finalDashboardUrl}" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.4), 0 2px 4px -1px rgba(13, 148, 136, 0.2); transition: all 0.2s;">
                                Go to Organizer Dashboard
                            </a>
                        </div>
                        
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #1a202c; padding: 30px 20px; text-align: center;">
                        <p style="margin: 0 0 15px; font-size: 14px; color: #718096; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Event Management Company</p>
                        <p style="margin: 0; font-size: 12px; color: #4a5568;">
                            &copy; ${currentYear} Event Management Company. Crafted for exclusivity and intelligence.
                        </p>
                    </div>
                </div>
                
                <p style="text-align: center; margin-top: 25px; font-size: 13px; color: #94a3b8;">
                    This email is automatically sent to event organizers upon creation.<br>Please do not reply directly to this message.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Event Operations" <${SMTP_CONFIG.auth.user}>`,
            to: recipientEmail,
            subject: `Success: Your event "${eventName}" is ready`,
            html: htmlContent
        });

        console.log(`Notification sent successfully to ${recipientEmail}`);
        return info;
    } catch (error) {
        console.error('Failed to send event creation notification:', error);
        throw error;
    }
}

// Script execution handling
const isMainModule = process.argv[1] && process.argv[1].endsWith('event_creation_notification.js');
if (isMainModule) {
    const args = process.argv.slice(2);

    if (args.length < 5) {
        console.error('Usage: node event_creation_notification.js <recipientEmail> <eventName> <date> <time> <location> [dashboardUrl]');
        process.exit(1);
    }

    const [recipientEmail, eventName, date, time, location, dashboardUrl] = args;

    sendEventCreationNotification(recipientEmail, eventName, date, time, location, dashboardUrl)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

export default sendEventCreationNotification;
