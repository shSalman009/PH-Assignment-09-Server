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
    const commentsCollection = db.collection("comments");

    // Get All Ideas
    app.get("/ideas", async (req, res) => {
      const params = req.query;
      const cursor = ideasCollection.find(params);
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

    // Edit Idea
    app.patch("/ideas/:id", async (req, res) => {
      const { id } = req.params;
      const ideaData = req.body;
      const response = await ideasCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: ideaData },
      );
      res.send(response);
    });

    // Delete Idea
    app.delete("/ideas/:id", async (req, res) => {
      const { id } = req.params;

      // Delete all comments related to the idea
      await commentsCollection.deleteMany({ ideaId: id });

      const response = await ideasCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(response);
    });

    // Get Comments
    app.get("/comments", async (req, res) => {
      const params = req.query;
      const cursor = commentsCollection.find(params).sort({ createdAt: -1 });
      const comments = await cursor.toArray();
      res.send(comments);
    });

    // Create Comment
    app.post("/comments", async (req, res) => {
      const commentData = req.body;
      const response = await commentsCollection.insertOne(commentData);

      // Increment comment count in the related idea
      if (response.acknowledged && response.insertedId) {
        await ideasCollection.updateOne(
          { _id: new ObjectId(commentData.ideaId) },
          { $inc: { commentCount: 1 } },
        );
      }

      res.send(response);
    });

    // Edit Comment
    app.patch("/comments/:id", async (req, res) => {
      const { id } = req.params;
      const commentData = req.body;
      const response = await commentsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...commentData,
            edited: true,
          },
        },
      );
      res.send(response);
    });

    // Delete Comment
    app.delete("/comments/:id", async (req, res) => {
      const { id } = req.params;
      const { ideaId } = req.query;
      const response = await commentsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      // Decrement comment count in the related idea
      if (response.deletedCount > 0) {
        await ideasCollection.updateOne(
          { _id: new ObjectId(ideaId) },
          { $inc: { commentCount: -1 } },
        );
      }

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
