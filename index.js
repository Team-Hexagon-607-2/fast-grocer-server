const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ifxvjm9.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const productsCollection = client.db('fastGrocer').collection('products');
        const categoriesCollection = client.db('fastGrocer').collection('productCategory');
        const usersCollection = client.db('fastGrocer').collection('users');
        const wishlistCollection = client.db('fastGrocer').collection('wishlist');

        app.post('/products', async(req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        app.get('/products', async(req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        app.get('/products/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        app.post('/categories', async(req, res) => {
            const category = req.body;
            const result = await categoriesCollection.insertOne(category);
            res.send(result);
        })

        app.get('/categories', async(req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id)};
            const product = await productsCollection.findOne(query);
            res.send(product);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users', async(req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.get("/search", async (req, res) => {
            const searchText = req.query.q;
            const query = { $text: { $search: searchText } };
            const matches = await productsCollection.find(query).toArray();
            res.send(matches);
          });

          app.post("/wishlist", async (req, res) => {
            try {
              const newData = req.body;
              const query = {
                productId: newData?.productId,
              };

              const alreadyWishlistItem = await wishlistCollection.findOne(query);

              if (alreadyWishlistItem === true) {
                return res
                  .status(400)
                  .json({ status: false, message: "Already booked this item" });
              } else {
                await wishlistCollection.insertOne(newData);

                res
                  .status(200)
                  .json({ status: true, message: "Added Product on Wishlist" });
              }
            } catch (error) {
              res.status(400).json({ status: false, message: error.message });
            }
          });

          app.get("/wishlist/:email", async (req, res) => {
            try {
              const email = req.params.email;

              const wishlistByEmail = await wishlistCollection.find({ email: email })
                .sort({ createdAt: -1 })
                .toArray();
              res.status(200).json({ status: true, data: wishlistByEmail });
            } catch (error) {
              res.status(400).json({ status: false, message: error.message });
            }
          });

          app.delete("/wishlist/:id",async (req, res) => {
            try {
              const id = req.params.id;
              const filter = { _id: ObjectId(id) };
              await wishlistCollection.deleteOne(filter);
              res.status(200).json({ status: true, message: "Item Delete Successfully" });
            } catch (error) {
              res.status(400).json({ status: false, message: error.message });
            }
          });

    }
    finally{

    }
}

run().catch(console.log)

app.get('/', async(req, res) =>{
    res.send('Fast Grocer server is running');
})

app.listen(port, () => console.log(`Fast Grocer running on ${port}`));