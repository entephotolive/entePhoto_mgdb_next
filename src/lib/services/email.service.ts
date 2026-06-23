import nodemailer from "nodemailer";
import path from "path";
import { AdminModel } from "../../models/Admin";
import { connectToDatabase } from "../db/mongodb";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});



function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
  try {
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"EntePhoto" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Welcome to EntePhoto!",
      html: `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Welcome to EntePhoto</title>

  <style>
    /* Basic reset */
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background-color: #f3f5f4;
    }

    table, td {
      border-collapse: collapse !important;
    }

    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
      display: block;
      max-width: 100%;
      height: auto;
    }

    a {
      text-decoration: none;
    }

    p {
      margin: 0;
    }

    /* Mobile */
    @media only screen and (max-width: 620px) {
      .container {
        width: 100% !important;
      }

      .px-40 {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      .pt-40 {
        padding-top: 28px !important;
      }

      .pb-40 {
        padding-bottom: 28px !important;
      }

      .hero-title {
        font-size: 28px !important;
        line-height: 36px !important;
      }

      .body-text {
        font-size: 15px !important;
        line-height: 24px !important;
      }

      .stack-column,
      .stack-column td {
        display: block !important;
        width: 100% !important;
      }

      .center-mobile {
        text-align: center !important;
      }

      .contact-inline {
        display: block !important;
        width: 100% !important;
        margin-bottom: 8px !important;
      }

      .phone-break {
        display: block !important;
        margin: 6px 0 !important;
      }

      .mobile-button {
        width: 100% !important;
      }

      .mobile-button a {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f3f5f4; font-family:Arial, Helvetica, sans-serif; color:#334155;">
  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    Welcome to EntePhoto — create events, upload photos instantly, and deliver memories beautifully.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f5f4; margin:0; padding:0;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <!-- Main Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:18px; overflow:hidden;">
          
          <!-- Hero Banner -->
          <tr>
            <td style="background-color:#e8ece8;">
              <img
                src="cid:welcome_image"
                alt="How EntePhoto Works"
                width="600"
                style="width:100%; max-width:600px; height:auto; display:block;"
              />
            </td>
          </tr>

          <!-- Welcome Content -->
          <tr>
            <td class="px-40 pt-40" style="padding:40px 40px 20px 40px;">
              <p style="font-size:12px; line-height:18px; letter-spacing:1.2px; text-transform:uppercase; color:#6b7d70; font-weight:700; margin-bottom:12px;">
                Welcome to EntePhoto
              </p>

              <h1 class="hero-title" style="margin:0; font-size:34px; line-height:42px; color:#0f172a; font-weight:800;">
                Hi ${escapeHtml(userName)}, welcome to EntePhoto!
              </h1>
            </td>
          </tr>

          <tr>
            <td class="px-40" style="padding:0 40px 10px 40px;">
              <p class="body-text" style="font-size:16px; line-height:28px; color:#475569; margin:0 0 16px 0;">
                Thank you for joining <strong>EntePhoto</strong>. We’re excited to have you with us as a photographer.
              </p>

              <p class="body-text" style="font-size:16px; line-height:28px; color:#475569; margin:0 0 16px 0;">
                EntePhoto helps you create events, upload photos instantly, and deliver memories to guests in a seamless way.
              </p>

              <p class="body-text" style="font-size:16px; line-height:28px; color:#475569; margin:0;">
                Your dashboard is ready — you can start creating events and sharing photos right away.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td class="px-40" align="center" style="padding:28px 40px 18px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="mobile-button">
                <tr>
                  <td align="center" bgcolor="#5f7f66" style="border-radius:10px;">
                    <a
                      href="https://entephoto.co.in/photographer/dashboard"
                      target="_blank"
                      style="display:inline-block; padding:14px 28px; font-size:16px; line-height:20px; font-weight:700; color:#ffffff; background-color:#5f7f66; border-radius:10px;"
                    >
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 8px 40px 0 40px;">
              <div style="height:1px; background-color:#e5e7eb; line-height:1px; font-size:1px;">&nbsp;</div>
            </td>
          </tr>

          <!-- How it works -->
          <tr>
            <td class="px-40" style="padding:28px 40px 10px 40px;">
              <h2 style="margin:0 0 16px 0; font-size:22px; line-height:30px; color:#0f172a; font-weight:800;">
                How EntePhoto works
              </h2>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 14px 0;">
                    <p style="margin:0; font-size:16px; line-height:26px; color:#1f2937; font-weight:700;">
                      1. Create Event
                    </p>
                    <p class="body-text" style="margin:6px 0 0 0; font-size:15px; line-height:26px; color:#475569;">
                      Create your event in seconds and get a unique QR code for your guests.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 0 14px 0;">
                    <p style="margin:0; font-size:16px; line-height:26px; color:#1f2937; font-weight:700;">
                      2. Upload Photos
                    </p>
                    <p class="body-text" style="margin:6px 0 0 0; font-size:15px; line-height:26px; color:#475569;">
                      Upload event photos instantly so every moment stays in one place.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0;">
                    <p style="margin:0; font-size:16px; line-height:26px; color:#1f2937; font-weight:700;">
                      3. Guests Scan Face
                    </p>
                    <p class="body-text" style="margin:6px 0 0 0; font-size:15px; line-height:26px; color:#475569;">
                      Guests can scan their face on your event page and access their photos instantly.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support Section -->
          <tr>
            <td class="px-40 pb-40" style="padding:30px 40px 40px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8faf8; border:1px solid #e6ece7; border-radius:14px;">
                <tr>
                  <td style="padding:24px;">
                    <h3 style="margin:0 0 10px 0; font-size:18px; line-height:26px; color:#0f172a; font-weight:800;">
                      Need help getting started?
                    </h3>

                    <p class="body-text" style="margin:0 0 18px 0; font-size:15px; line-height:26px; color:#475569;">
                      Our team is here to help you set up your first event and start sharing photos smoothly.
                    </p>

                    <!-- Contact row -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <!-- Phone row -->
                      <tr>
                        <td style="padding:0 0 14px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                            <tr>
                              <td valign="middle" style="padding-right:6px;">
                                <img src="https://img.icons8.com/material-rounded/24/0f172a/phone--v1.png" width="16" height="16" style="display:block;" alt=""/>
                              </td>
                              <td valign="middle">
                                <span style="font-size:14px; line-height:20px; color:#0f172a; font-weight:700;">Phone</span>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0; font-size:14px; line-height:24px; color:#475569;">
                            <a href="tel:8129415244" style="color:#5f7f66; text-decoration:none; font-weight:600;">+91 8129415244</a>
                            <span style="color:#cbd5e1;">&nbsp;|&nbsp;</span>
                            <a href="tel:7034137000" style="color:#5f7f66; text-decoration:none; font-weight:600;">+91 7034137000</a>
                            <span style="color:#cbd5e1;">&nbsp;|&nbsp;</span>
                            <a href="tel:8075393896" style="color:#5f7f66; text-decoration:none; font-weight:600;">+91 8075393896</a>
                          </p>
                        </td>
                      </tr>

                      <!-- Email + Instagram -->
                      <tr>
                        <td>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr class="stack-column">
                              <!-- Email -->
                              <td valign="top" style="padding:0 0 12px 0;">
                                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                                    <tr>
                                      <td valign="middle" style="padding-right:6px;">
                                        <img src="https://img.icons8.com/material-rounded/24/0f172a/mail.png" width="16" height="16" style="display:block;" alt=""/>
                                      </td>
                                      <td valign="middle">
                                        <span style="font-size:14px; line-height:20px; color:#0f172a; font-weight:700;">Email</span>
                                      </td>
                                    </tr>
                                  </table>
                                <p style="margin:0; font-size:14px; line-height:24px; color:#475569;">
                                  <a href="mailto:entephoto.live@gmail.com" style="color:#5f7f66; text-decoration:none; font-weight:600;">
                                    entephoto.live@gmail.com
                                  </a>
                                </p>
                              </td>
                            </tr>

                            <tr class="stack-column">
                              <!-- Instagram -->
                              <td valign="top" style="padding:6px 0 0 0;">
                                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                                    <tr>
                                      <td valign="middle" style="padding-right:6px;">
                                        <img src="https://img.icons8.com/material-rounded/24/0f172a/instagram-new.png" width="16" height="16" style="display:block;" alt=""/>
                                      </td>
                                      <td valign="middle">
                                        <span style="font-size:14px; line-height:20px; color:#0f172a; font-weight:700;">Instagram</span>
                                      </td>
                                    </tr>
                                  </table>
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td valign="middle">
                                      <a
                                        href="https://www.instagram.com/entephoto.ai/"
                                        target="_blank"
                                        style="font-size:14px; line-height:24px; color:#5f7f66; text-decoration:none; font-weight:600;"
                                      >
                                        @entephoto.ai
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:0 24px 28px 24px;">
              <p style="margin:0 0 8px 0; font-size:13px; line-height:22px; color:#64748b;">
                © ${currentYear} EntePhoto. All rights reserved.
              </p>
              <p style="margin:0; font-size:12px; line-height:20px; color:#94a3b8;">
                This is an automated email from EntePhoto. Please do not reply directly to this message.
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
          filename: "welcome-banner.png",
          path: path.join(process.cwd(), "public", "mail", "IMG_0827.PNG"),
          cid: "welcome_image",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.info(`Welcome email sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};



export const sendAdminNotificationEmail = async (newUserEmail: string, newUserName: string, userPhone?: string) => {
  try {
    await connectToDatabase();
    
    const admins = await AdminModel.find({}, "email").lean();
    const adminEmails = admins.map(admin => admin.email);

    if (adminEmails.length === 0) {
      console.warn("No admins found to send notification email to.");
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmails,
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
    console.info(`Admin notification email sent for ${newUserEmail} to ${adminEmails.length} admins.`);
  } catch (error) {
    console.error("Error sending admin notification email:", error);
  }
};
