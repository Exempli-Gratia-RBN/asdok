const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const express = require("express");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Configuration, OpenAIApi } = require("openai");

const { PatientModel } = require("./api/model/patient.model.js");
const { ChatModel } = require("./api/model/chat.model.js");

require("dotenv").config();
require("./api/config/db.js").connect();

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");
app.use(express.static("./public"));

let spesialis = [
  "penyakit dalam",
  "bedah",
  "anak",
  "mata",
  "gigi",
  "kulit",
  "tht",
  "kadungan",
  "kardiologi",
  "paru-paru",
  "neurologi",
  "hematologi",
  "alergi",
  "kejiwaan",
  "rehabilitas medis",
  "epidemiologi",
  "radiologi",
  "bedah plastik",
  "ortopedi",
  "psikiatri",
  "onkologi",
  "endokrinologi",
  "gastroenterologi",
  "urologi",
  "urologi",
  "nefrologi",
  "ortopedi pediatrik",
  "neontologi",
  "geriatri",
];

app.use((req, res, next) => {
  let url = req.originalUrl;
  let token = req.cookies.token;
  if (!token) {
    if (url == "/login" || url == "/daftar") {
      next();
      return;
    }
    res.redirect("/login");
    return;
  }
  jwt.verify(token, process.env.JWT_SECRET, async (err, r) => {
    try {
      if (err || !r) {
        res.clearCookie("token");
        res.redirect("/login");
        return;
      }
      if (url == "/login") {
        res.redirect("/");
        return;
      }
      let patient = await PatientModel.findOne(
        { nik: r.nik },
        "-password"
      ).lean();
      req.patient = patient;
      next();
    } catch (err) {
      console.log(err);
      res.sendStatus(401);
      return;
    }
  });
});

app.get("/", async (req, res) => {
  let chats = await ChatModel.find({ patient_id: req.patient._id }).lean();
  chats.nama = req.patient.name;
  console.log(chats[0].content.result.split("\n"));
  res.render("pages/home", { chats });
});

app.get("/login", async (req, res) => {
  res.render("pages/login");
});
app.get("/daftar", async (req, res) => {
  res.render("pages/daftar");
});

app.post("/ask", async (req, res) => {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: `saya adalah seorang dokter, apa saja yang harus ditanyakan jika pasien memiliki keluhan ${req.body.q}, list dengan format --`,
      },
    ],
  });
  console.log(`~~~\n${completion.data.choices[0].message.content}\n~~~`);
  let qs = completion.data.choices[0].message.content
    .split("\n")
    .map((v) => {
      if (/^\d/.test(v)) {
        return v.split(".")[1].trim();
      }
    })
    .filter((e) => !!e);
  res.status(200).json({
    q: qs,
  });
});

app.post("/rekom", async (req, res) => {
  let rekap = req.body;
  let keluhan = "";
  rekap.map((v) => {
    keluhan += `${v.asdok} ${v.client}, `;
  });
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: `${keluhan} kemungkinan penyakit yang dialami berdasar dari keluhan itu adalah, dan dokter spesialis yang dapat menanganinya adalah?`,
      },
    ],
  });
  let chat = new ChatModel({
    patient_id: req.patient._id,
    content: {
      chat: rekap,
      result: completion.data.choices[0].message.content,
    },
  });
  await chat.save();
  console.log(chat);
  let dokter = [];
  spesialis.forEach((v) => {
    if (completion.data.choices[0].message.content.toLowerCase().includes(v)) {
      dokter.push(v);
    }
  });

  res.json({
    msg: completion.data.choices[0].message.content,
    dokter: dokter,
    chat_id: chat._id,
  });
});

app.post("/dokter", async (req, res) => {
  const dokter = [
    {
      nama: "genta",
      spesialis: "paru-paru",
    },
    {
      nama: "rido",
      spesialis: "ortopedi",
    },
    {
      nama: "budo",
      spesialis: "tht",
    },
    {
      nama: "budi",
      spesialis: "alergi",
    },
    {
      nama: "budi",
      spesialis: "kulit",
    },
    {
      nama: "budi",
      spesialis: "gigi",
    },
    {
      nama: "budi",
      spesialis: "mata",
    },
    {
      nama: "budi",
      spesialis: "kadungan",
    },
  ];
  if (req.body.sp) {
    let need = req.body.sp.split(",");
    let avail = [];
    dokter.forEach((v) => {
      if (need.includes(v.spesialis)) {
        avail.push(v);
      }
    });
    await ChatModel.findByIdAndUpdate(
      req.body.chat_id,
      { doctors: avail },
      { new: true }
    );
    res.json({
      dokter: avail,
    });
  }
});

app.post("/daftar", async (req, res) => {
  try {
    const { nama, nik, password } = req.body;
    let salt = await bcrypt.genSalt(10);
    let pw = await bcrypt.hash(password, salt);
    const patient = new PatientModel({
      name: nama,
      nik,
      password: pw,
    });
    await patient.save();
    return res.status(200).json(patient);
  } catch (err) {
    console.log(err.stack);
    res.status(500).json(err.message);
    return;
  }
});

app.post("/login", async (req, res) => {
  try {
    const { nik, password, remember } = req.body;
    let patient = await PatientModel.findOne({ nik: nik });
    if (patient) {
      let match = await bcrypt.compare(password, patient.password);
      if (match) {
        let token = jwt.sign({ nik: patient.nik }, process.env.JWT_SECRET, {
          expiresIn: 86400,
        });
        res.cookie("token", token, { maxAge: 86400000 });
        res.status(200).json({ msg: "Login berhasil" });
        return;
      } else {
        res.status(400).json({ msg: "Login gagal" });
        return;
      }
    } else {
      res.status(400).json({ msg: "Login gagal" });
      return;
    }
  } catch (err) {
    console.log(err.stack);
    res.status(500).json(err.message);
    return;
  }
});

app.get("/logout", async (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500).send("Ruksak eung");
  return;
});

const server = http.createServer(app);
server.listen(5000);
console.log("Server listening in http://localhost:5000");
