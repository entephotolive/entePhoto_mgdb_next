import nodemailer from "nodemailer";
import path from "path";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Welcome to EntePhoto!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to EntePhoto</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8; color: #334155; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 600px;">
                  
                  <!-- Banner Image -->
                  <tr>
                    <td align="center" style="background-color: #081b24;">
                      <img src="cid:welcome_image" alt="Welcome to EntePhoto" style="display: block; width: 100%; max-width: 600px; border: 0;" />
                    </td>
                  </tr>
                  
                  <!-- Content Body -->
                  <tr>
                    <td style="padding: 40px 40px 30px 40px;">
                      <h1 style="margin: 0 0 20px 0; font-size: 26px; color: #0f172a; font-weight: 800;">Welcome, ${userName}! 🎉</h1>
                      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                        Thank you for choosing us. We are absolutely thrilled to have you on board as a photographer at <strong>EntePhoto</strong>.
                      </p>
                      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                        Get ready to showcase your talent, capture amazing moments, and grow your photography business with our platform.
                      </p>
                      
                      <!-- CTA Button -->
                      <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                        <tr>
                          <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);">
                            <a href="https://entephoto.co.in/photographer/dashboard" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Contact & Footer -->
                  <tr>
                    <td style="padding: 30px 40px 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                      <h3 style="margin: 0 0 16px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Need Assistance?</h3>
                      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                        Our support team is here to help you get started. Feel free to reach out to us through any of the channels below:
                      </p>
                      
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #475569; line-height: 1.8;">
                        <tr>
                          <td width="50%" valign="top">
                            <strong style="color: #0f172a;">📞 Phone</strong><br/>
                            <a href="tel:8129415244" style="color: #0ea5e9; text-decoration: none;">+91 8129415244</a><br/>
                            <a href="tel:7034137000" style="color: #0ea5e9; text-decoration: none;">+91 7034137000</a><br/>
                            <a href="tel:8075393896" style="color: #0ea5e9; text-decoration: none;">+91 8075393896</a>
                          </td>
                          <td width="50%" valign="top">
                            <strong style="color: #0f172a;">✉️ Email & Social</strong><br/>
                            <a href="mailto:entephoto.live@gmail.com" style="color: #0ea5e9; text-decoration: none;">entephoto.live@gmail.com</a><br/>
                            <a href="https://www.instagram.com/entephoto.ai/" style="color: #0ea5e9; text-decoration: none;">@entephoto.ai</a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0 0; font-size: 13px; color: #94a3b8; text-align: center;">
                        &copy; ${new Date().getFullYear()} EntePhoto. All rights reserved.<br/>
                        Automated message, please do not reply.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'IMG_0827.PNG',
          path: path.join(process.cwd(), 'public', 'mail', 'IMG_0827.PNG'),
          cid: 'welcome_image' // same cid value as in the html img src
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.info(`Welcome email sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};

export const sendAdminNotificationEmail = async (newUserEmail: string, newUserName: string, userPhone?: string) => {
  try {
    const adminEmail = "entephoto.live@gmail.com";
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: "New Photographer Registration",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>New Photographer Registered</h2>
          <p>A new photographer has registered on the platform:</p>
          <ul>
            <li><strong>Name:</strong> ${newUserName}</li>
            <li><strong>Email:</strong> ${newUserEmail}</li>
            <li><strong>Phone:</strong> ${userPhone || 'Not provided'}</li>
          </ul>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.info(`Admin notification email sent for ${newUserEmail}`);
  } catch (error) {
    console.error("Error sending admin notification email:", error);
  }
};
