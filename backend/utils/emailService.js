const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send registration confirmation email with ticket
exports.sendRegistrationEmail = async (participant, event, registration) => {
  try {
    const transporter = createTransporter();

    const eventDate = new Date(event.eventStartDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const ticketUrl = `${process.env.FRONTEND_URL}/ticket/${registration.ticketId}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .ticket-box {
            background: white;
            border: 2px dashed #667eea;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .ticket-id {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
          }
          .qr-code {
            margin: 20px 0;
          }
          .qr-code img {
            max-width: 200px;
          }
          .event-details {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-label {
            font-weight: bold;
            color: #667eea;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            padding: 20px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Registration Successful!</h1>
            <p>You're all set for the event</p>
          </div>
          
          <div class="content">
            <p>Hi ${participant.firstName},</p>
            <p>Thank you for registering for <strong>${event.eventName}</strong>!</p>
            
            <div class="ticket-box">
              <h2>Your Ticket</h2>
              <div class="ticket-id">${registration.ticketId}</div>
              <div class="qr-code">
                <img src="${registration.qrCode}" alt="QR Code" />
              </div>
              <p style="color: #666; font-size: 14px;">
                Present this QR code at the event entrance
              </p>
            </div>
            
            <div class="event-details">
              <h3 style="color: #667eea; margin-top: 0;">Event Details</h3>
              <div class="detail-row">
                <span class="detail-label">Event:</span>
                <span>${event.eventName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span>${event.eventType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date & Time:</span>
                <span>${eventDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Registration Fee:</span>
                <span>₹${registration.amountPaid}</span>
              </div>
              ${event.eventType === 'Merchandise' && registration.merchandiseOrder ? `
              <div class="detail-row">
                <span class="detail-label">Item:</span>
                <span>${registration.merchandiseOrder.variant.size} - ${registration.merchandiseOrder.variant.color}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Quantity:</span>
                <span>${registration.merchandiseOrder.quantity}</span>
              </div>
              ` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${ticketUrl}" class="button">View Ticket Online</a>
            </div>
            
            <p style="margin-top: 30px;">
              <strong>Important:</strong><br>
              • Save this email or download your ticket<br>
              • Bring a valid ID to the event<br>
              • Arrive 15 minutes early for check-in
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated email from Felicity Event Management System</p>
            <p>If you have any questions, please contact the event organizer</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: participant.email,
      subject: `Registration Confirmed: ${event.eventName}`,
      html: htmlContent,
      attachments: [
        {
          filename: `ticket-${registration.ticketId}.png`,
          content: registration.qrCode.split('base64,')[1],
          encoding: 'base64'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${participant.email}`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (user, userType) => {
  try {
    const transporter = createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Felicity! 🎊</h1>
          </div>
          <div class="content">
            <p>Hi ${user.firstName || user.organizerName},</p>
            <p>Welcome to the Felicity Event Management System!</p>
            <p>Your account has been successfully created.</p>
            <p>You can now log in and start exploring events.</p>
            <p><a href="${process.env.FRONTEND_URL}/login" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Login Now</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Welcome to Felicity Events!',
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};

// Send organizer credentials
exports.sendOrganizerCredentials = async (organizer, tempPassword) => {
  try {
    const transporter = createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .credentials { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Organizer Account Created</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>An organizer account has been created for <strong>${organizer.organizerName}</strong> on Felicity Event Management System.</p>
            
            <div class="credentials">
              <h3>Login Credentials</h3>
              <p><strong>Email:</strong> ${organizer.email}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> Please change your password after first login for security.
            </div>
            
            <p><a href="${process.env.FRONTEND_URL}/login" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Login Now</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: organizer.email,
      subject: 'Your Felicity Organizer Account Credentials',
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Credentials email error:', error);
    return false;
  }
};

// Notify admin about a new password reset request
exports.sendPasswordResetNotificationToAdmin = async (adminEmail, organizer, request) => {
  try {
    const transporter = createTransporter();
    const htmlContent = `
      <p>Admin,</p>
      <p>A password reset request has been submitted by organizer <strong>${organizer.organizerName}</strong> (${organizer.email}).</p>
      <p><strong>Reason:</strong> ${request.reason}</p>
      <p>Request ID: ${request._id}</p>
      <p>Please review and approve or reject the request in the admin panel.</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: adminEmail,
      subject: `Password Reset Request: ${organizer.organizerName}`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Notify admin email error:', error);
    return false;
  }
};

// Notify organizer about rejection of password reset request
exports.sendPasswordResetRejectionEmail = async (organizer, comment) => {
  try {
    const transporter = createTransporter();
    const htmlContent = `
      <p>Hi ${organizer.organizerName},</p>
      <p>Your password reset request has been reviewed and <strong>rejected</strong>.</p>
      <p><strong>Reason from admin:</strong> ${comment || 'No comment provided'}</p>
      <p>If you believe this is a mistake, please contact support.</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: organizer.email,
      subject: 'Password Reset Request Rejected',
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Password reset rejection email error:', error);
    return false;
  }
};

// Send team invite email
exports.sendTeamInviteEmail = async (toEmail, team, link) => {
  try {
    const transporter = createTransporter();
    const htmlContent = `
      <p>Hello,</p>
      <p>You have been invited to join the team <strong>${team.teamName || 'Team'}</strong> for event <strong>${team.event?.eventName || ''}</strong>.</p>
      <p>Click the link to accept the invitation:</p>
      <p><a href="${link}">${link}</a></p>
      <p>If you don't have an account, please register first with the same email and then accept the invite.</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `Invitation to join team ${team.teamName || ''}`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Team invite email error:', error);
    return false;
  }
};