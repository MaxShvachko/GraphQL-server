import nodemailer from "nodemailer";

export default async function sendEmail(to: string, html: string) {

  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: 'obspgomusg332ike@ethereal.email',
      pass: 'PUhb382wgP95aAyBNd',
    },
  });

  let info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>',
    to,
    subject: "Hello ✔",
    html
  });

  console.log("Message sent: %s", info.messageId);

  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
