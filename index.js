const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ifxvjm9.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// middleware verify JWT
function verifyJWT(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).send({ message: 'unauthorized user', statusCode: 401 });
  }

  const token = header.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
    if (error) {
      return res.status(403).send({ message: 'forbidden access', statusCode: 403 })
    }

    req.decoded = decoded;
    next();
  })
};


async function run() {
  try {
    const productsCollection = client.db("fastGrocer").collection("products");
    const categoriesCollection = client
      .db("fastGrocer")
      .collection("productCategory");
    const usersCollection = client.db("fastGrocer").collection("users");
    const wishlistCollection = client.db("fastGrocer").collection("wishlist");
    const orderCollection = client.db("fastGrocer").collection("order");
    const reviewsCollection = client.db("fastGrocer").collection("reviews");
    const deliveryOrderCollection = client
      .db("fastGrocer")
      .collection("deliveryOrder");
    const couponsCollection = client.db("fastGrocer").collection("coupons");

    app.get('/jwt/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);

      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10d' });
        return res.send({ accessToken: token })
      }

      res.status(403).send({ accessToken: '' });
    });

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: 'forbidden access', statusCode: 403 });
      }

      const filter = { email: email };
      const DBUser = await usersCollection.findOne(filter);
      if (DBUser.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access', statusCode: 403 });
      }

      next()
    };

    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = user.email;
      const query = { email }
      const userData = await usersCollection.findOne(query)

      if (!userData) {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      }
      else {
        res.send({ acknowledged: false })
      }
    });

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.get('/searchproduct', async (req, res) => {
      const name = req.query.name;
      try {
        if (name) {
          // let pipeline = ;
          // let collection = client.db("fastGrocer").collection("products");
          // result = await collection.aggregate(pipeline).toArray();
          const result = await productsCollection.aggregate([
            {
              $search: {
                index: "searchProducts",
                "autocomplete": {
                  "path": "name",
                  "query": req.query.name,
                  // "fuzzy": {
                  //   "maxEdits": 1
                  // },
                  "tokenOrder": "sequential"
                }
              }
            },
            {
              $limit: 10
            },
            {
              $project: {
                "name": 1,
                "imageUrl": 1,
                "price": 1
              }
            }
          ]).toArray();
          res.send(result);
        }
      }
      catch (error) {
        console.error(error);
        res.send([]);
      }
    });

    app.post("/add-product", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.delete("/product-delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/allProducts", async (req, res) => {
      const query = {};
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // Edit individual product data
    app.put('/product/:id', async (req, res) => {
      const id = req.params.id;
      const updatedProductData = req.body;
      const filter = { _id: ObjectId(id) };
      if (updatedProductData?.imageUrl) {
        const updatedDoc = {
          $set: {
            name: updatedProductData?.name,
            category_name: updatedProductData?.category_name,
            original_price: updatedProductData?.original_price,
            save: updatedProductData?.save,
            price: updatedProductData?.price,
            bundle: updatedProductData?.bundle,
            quantity: updatedProductData?.quantity,
            stock: updatedProductData?.stock,
            sub_category: updatedProductData?.sub_category,
            imageUrl: updatedProductData?.imageUrl,
            description: updatedProductData?.description,
          }
        }
        const result = await productsCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } else {
        const updatedDoc = {
          $set: {
            name: updatedProductData?.name,
            category_name: updatedProductData?.category_name,
            original_price: updatedProductData?.original_price,
            save: updatedProductData?.save,
            price: updatedProductData?.price,
            bundle: updatedProductData?.bundle,
            quantity: updatedProductData?.quantity,
            stock: updatedProductData?.stock,
            sub_category: updatedProductData?.sub_category,
            description: updatedProductData?.description,
          }
        }
        const result = await productsCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    })

    app.post("/categories", async (req, res) => {
      const category = req.body;
      const result = await categoriesCollection.insertOne(category);
      res.send(result);
    });

    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesCollection.find(query).toArray();
      res.send(categories);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    })

    app.get("/reviews", async (req, res) => {
      const query = {};
      const reviews = await reviewsCollection.find(query).toArray();
      res.send(reviews);
    })

    app.post("/add-coupon", verifyJWT, verifyAdmin, async (req, res) => {
      const coupon = req.body;
      const result = await couponsCollection.insertOne(coupon);
      res.send(result);
    })

    app.get("/get-coupons", verifyJWT, async (req, res) => {
      const query = {};
      const result = await couponsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/delete-coupon/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await couponsCollection.deleteOne(query);
      res.send(result);
    });

    // search api
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

        const wishlistByEmail = await wishlistCollection
          .find({ email: email })
          .sort({ createdAt: -1 })
          .toArray();
        res.status(200).json({ status: true, data: wishlistByEmail });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    app.delete("/wishlist/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        await wishlistCollection.deleteOne(filter);
        res
          .status(200)
          .json({ status: true, message: "Item Delete Successfully" });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    app.get("/allBuyers", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "buyer" };
      const buyers = await usersCollection.find(query).toArray();
      res.send(buyers);
    });

    app.get("/allDeliverymen", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "delivery man" };
      const deliverymen = await usersCollection.find(query).toArray();
      res.send(deliverymen);
    });

    app.get("/deliveryman-work-status", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.put("/deliveryman", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const certification = req.body.certification;
      const result = await usersCollection.findOne(filter);
      if (result) {
        const option = { upsert: true };
        const updatedDoc = {
          $set: {
            verified: false,
            workPermitStatus: "pending",
            certification: certification,
          },
        };
        const updateResult = await usersCollection.updateOne(
          filter,
          updatedDoc,
          option
        );
        res.send(updateResult);
      } else {
        return;
      }
    });

    // delivery man's request accept
    app.put("/deliveryman-request-accept", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const result = await usersCollection.findOne(filter);
      if (result) {
        const updatedDoc = {
          $set: {
            verified: true,
            workPermitStatus: "Accepted",
            availabilityStatus: true,
          },
        };
        const updateResult = await usersCollection.updateOne(
          filter,
          updatedDoc
        );
        res.send(updateResult);
      } else {
        return;
      }
    });

    // delivery man's request reject
    app.put("/deliveryman-request-reject", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const result = await usersCollection.findOne(filter);
      if (result) {
        const updatedDoc = {
          $set: {
            verified: false,
            workPermitStatus: "Rejected",
          },
        };
        const updateResult = await usersCollection.updateOne(
          filter,
          updatedDoc
        );
        res.send(updateResult);
      } else {
        return;
      }
    })

    app.get('/delivered-orders', async (req, res) => {
      const email = req.query.email;
      const query = {
        deliveryManEmail: email,
        deliver: true
      };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.get("/users/deliverymen/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isDeliveryman: user?.role === "delivery man" });
    });

    app.get("/users/buyers/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === "buyer" });
    });

    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    app.put("/user/:email", verifyJWT, async (req, res) => {
      const user = req.body;
      const email = req.params.email;
      const filter = { email };
      
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          name: user?.updateName,
          image: user?.updateImage,
          contact: user?.updateContact
        }
      };
      
      const result = await usersCollection.updateOne(filter, updatedDoc, option);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    //Order Route 
    app.post("/order", async (req, res) => {
      try {
        const newData = req.body;
        await orderCollection.insertOne(newData);

        res
          .status(200)
          .json({ status: true, message: "Order Created Successfully" });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    app.get("/order/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const order = await orderCollection
          .find({ email: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.status(200).json({ status: true, data: order });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    app.get('/trackingOrder/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await orderCollection.find(query).sort({ createdAt: -1 }).toArray();
      return res.send(result);
    });

    app.get("/delivery-order/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const order = await orderCollection
          .find({ deliveryManEmail: email })
          .sort({ deliveryAssignTime: -1 })
          .toArray();

        res.status(200).json({ status: true, data: order });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    app.get("/allOrders", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const order = await orderCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.status(200).json({ status: true, data: order });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    app.get("/cancel-order", async (req, res) => {
      try {
        const order = await orderCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.status(200).json({ status: true, data: order });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    // product return request from buyer
    app.put("/return-request/:id", async (req, res) => {
      const id = req.params.id;
      const photo = req.body.productPhoto;
      const query = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          returnRequest: true,
          returnReason: req.body.returnReason,
          returnProductPhoto: photo
        }
      }
      const result = await orderCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    app.patch("/order/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const status = req.body.status;
        const filter = { _id: ObjectId(id) };
        const update = {
          $set: {
            status: status,
          },
        };
        await orderCollection.updateOne(filter, update);

        res.status(200).json({ status: true, message: `${status} Updated` });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    app.patch("/delivery-order/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const picked = req.body.picked;
        const filter = { _id: ObjectId(id) };
        const update = {
          $set: {
            pick: picked,
            status: "On The Way",
          },
        };
        await orderCollection.updateOne(filter, update);

        res.status(200).json({ status: true, message: `Updated` });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    app.patch("/delivery-complete/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const status = req.body.status;
        const filter = { _id: ObjectId(id) };
        const update = {
          $set: {
            pick: "Already Picked & Delivered",
            status: status,
            paid: true,
            deliver: true,
            deliveryTime: new Date(),
          },
        };
        await orderCollection.updateOne(filter, update);

        res.status(200).json({ status: true, message: `Updated` });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    app.patch("/cancel-order/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const cancel = req.body.cancel;
        const filter = { _id: ObjectId(id) };
        const update = {
          $set: {
            cancel: cancel,
          },
        };
        await orderCollection.updateOne(filter, update);

        res.status(200).json({ status: true, message: `${status} Updated` });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    // api for accept return product request
    app.put("/return-request-accept", async (req, res) => {
      const id = req.query.id;
      const query = { _id: ObjectId(id) };
      const findResult = await orderCollection.findOne(query);
      if (findResult) {
        const updatedDoc = {
          $set: {
            returnRequest: false,
            acceptReturnRequest: true
          }
        }
        const updateResult = await orderCollection.updateOne(query, updatedDoc);
        res.send(updateResult);
      }
    })

    // api for reject return product request
    app.put("/return-request-reject", async (req, res) => {
      const id = req.query.id;
      const query = { _id: ObjectId(id) };
      const findResult = await orderCollection.findOne(query);
      if (findResult) {
        const updatedDoc = {
          $set: {
            returnRequest: false,
            acceptReturnRequest: false
          }
        }
        const updateResult = await orderCollection.updateOne(query, updatedDoc);
        res.send(updateResult);
      }
    })


    app.patch("/update-delivery-order/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const data = req.body;

        const filter = { _id: ObjectId(id) };
        const update = {
          $set: {
            deliveryManEmail: data?.deliveryManEmail,
            deliveryManName: data?.deliveryManName,
            deliveryAssignTime: new Date(),
          },
        };
        await orderCollection.updateOne(filter, update);

        res
          .status(200)
          .json({ status: true, message: "updated delivery status" });
      } catch (error) {
        res.status(400).json({ status: false, message: error.message });
      }
    });

    //Payment
    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body.price;
      // const convertDollar = price / 110;
      const amount = parseFloat(price) * 100;
      console.log(amount);

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          currency: "usd",
          amount: amount,
          payment_method_types: ["card"],
          description: "Payment for item",
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        res.status(500).json({ status: false, message: error.message });
      }
    });
  } finally {
  }
}

run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Fast Grocer server is running");
});

app.listen(port, () => console.log(`Fast Grocer running on ${port}`));
