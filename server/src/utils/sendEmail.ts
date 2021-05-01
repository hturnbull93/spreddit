import nodemailer from "nodemailer";
import {
  MAILER_HOST,
  MAILER_PASS,
  MAILER_PORT,
  MAILER_USER,
} from "../constants";

export async function sendEmail(to: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: MAILER_HOST,
    port: MAILER_PORT,
    secure: false,
    auth: {
      user: MAILER_USER,
      pass: MAILER_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>',
    to,
    subject: "Reset Password",
    html,
  });

  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
