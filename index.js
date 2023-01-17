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
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const productsCollection = client.db('fastGrocer').collection('products');
        const categoriesCollection = client.db('fastGrocer').collection('categories');

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
    }
    finally{

    }
}

run().catch(console.log)

app.get('/', async(req, res) =>{
    res.send('Fast Grocer server is running');
})

app.listen(port, () => console.log(`Fast Grocer running on ${port}`));