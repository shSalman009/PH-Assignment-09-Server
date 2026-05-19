const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("idea-vault");
    const ideasCollection = db.collection("ideas");

    // Get All Ideas
    app.get("/ideas", async (req, res) => {
      const cursor = ideasCollection.find();
      const ideas = await cursor.toArray();
      res.send(ideas);
    });

    // Get Single Idea
    app.get("/ideas/:id", async (req, res) => {
      const { id } = req.params;
      const idea = await ideasCollection.findOne({ _id: new ObjectId(id) });
      res.send(idea);
    });

    // Create Idea
    app.post("/ideas", async (req, res) => {
      const ideaData = req.body;
      const response = await ideasCollection.insertOne(ideaData);
      res.send(response);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
