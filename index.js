const bodyParser = require("body-parser");
const express = require("express");
const http = require("http");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(express.static("public"));

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

app.get("/", async (req, res) => {
  res.render("pages/home");
});

app.get("/login", async (req, res) => {
  res.render("pages/login");
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
  console.log(`~~~\n
  ${completion.data.choices[0].message.content}\n
  ~~~`);
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
  let dokter = [];
  spesialis.forEach((v) => {
    if (completion.data.choices[0].message.content.toLowerCase().includes(v)) {
      dokter.push(v);
    }
  });

  res.json({
    msg: completion.data.choices[0].message.content,
    dokter: dokter,
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
    res.json({
      dokter: avail,
    });
  }
});

app.post("/login", async (req, res) => {});

const server = http.createServer(app);
server.listen(5000);
console.log("Server listening in http://localhost:5000");
