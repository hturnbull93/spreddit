import nodemailer from "nodemailer";

const createTestEmail = async () => {
  console.log(await nodemailer.createTestAccount());
};

createTestEmail();
