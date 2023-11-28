const express = require('express')
require("dotenv").config();
const app = express()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000
const cors = require('cors')
// const jwt = require("jsonwebtoken");


// middleware 
app.use(express.json());
app.use(cors())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j29nqmg.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {


        const usersCollection = client.db('fitness-tracker').collection('users')
        const trainersCollection = client.db('fitness-tracker').collection('trainers')
        // const memberCollection = client.db('fitness-tracker').collection('member')
        const newsletterCollection = client.db('fitness-tracker').collection('newsLetter')
        const classCollection = client.db('fitness-tracker').collection('class')
        const paymentHistryCollection = client.db('fitness-tracker').collection('paymentHistry')
        const infinityCollection = client.db('fitness-tracker').collection('infinityImg')

        const paymentHistory = [];



        //  JWT API 
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });
            res.send({ token })
        })

        // middle wares

        const verifyToken = (req, res, next) => {
            // console.log("insede verify", req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: "forbidden access" })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "forbidden access" })
                }
                req.decoded = decoded;
                next();
            })

        }


        //  all class get 
        app.get("/class", async (req, res) => {
            const cursor = classCollection.find();
            const result = await cursor.toArray()
            res.send(result)
        })
        app.post('/addClass', async (req, res) => {
            const user = req.body;
            const result = await classCollection.insertOne(user);
            res.send(result)
        })


        // All TRainers Get 
        app.get("/trainers", async (req, res) => {
            const cursor = trainersCollection.find();
            const result = await cursor.toArray()
            res.send(result)
        })
        //  specefic One user details API

        app.get("/trainers/:id", async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            };
            const result = await trainersCollection.findOne(query)
            res.send(result)
        })

        //  specifit member get api 

        app.get("/member/:id", async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            };
            const result = await trainersCollection.findOne(query)
            res.send(result)
        })


        app.patch("/users", async (req, res) => {
            // const trainer = req.query.role;
            const id = req.query.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: "trainer",
                },
            };
            const result = await trainersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        //  payment Histroy
        // app.post('/paymentHistory', async (req, res) => {
        //     const user = req.body;
        //     const result = await paymentHistryCollection.insertOne(user);
        //     res.send(result)
        // })



        app.post('/addTrainer', async (req, res) => {
            const user = req.body;
            const result = await trainersCollection.insertOne(user);
            res.send(result)
        })


        app.get('/roleTrainer', async (req, res) => {
            let query = {}
            if (req.query?.role) {
                query = { role: req.query.role }
            }
            const result = await trainersCollection.find(query).toArray();
            res.send(result)
        })


        // app.get('/trainer/:trainerName', async (req, res) => {
        //     const trainerName = req.params.trainerName;
        //     const filter = { name: trainerName };
        //     const result = await trainersCollection.findOne(filter);
        //     res.send(result);
        // })








        //  member role qurery get
        app.get('/memberTrainer', async (req, res) => {
            let query = {}
            if (req.query?.role) {
                query = { role: req.query.role }
            }
            const result = await trainersCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/admin', async (req, res) => {

            let query = {}
            if (req.query?.role) {
                query = { role: req.query.role }
            }
            const result = await trainersCollection.find(query).toArray();
            res.send(result)
        })




        //  create a admin releted api
        //  TODO : 

        // app.patch('/users/admin:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) };
        //     const updatedDoc = {
        //         $set: {
        //             role: 'admin'
        //         }
        //     }
        //     const result = await usersCollection.updateOne(filter, updatedDoc)
        //     res.send(result)
        // })



        // payment method api

        // app.post('/create-payment-intent', async (req, res) => {
        //     const { salary } = req.body
        //     const amount = parseInt(salary * 100);
        //     const paymentIntent = await stripe.paymentIntents.create({
        //         amount: amount,
        //         currency: "usd",
        //         payment_method_types: ['card']
        //     });
        //     res.send({
        //         clientSecret: paymentIntent.client_secret
        //     })
        // })



        //  payment method 

        app.post('/create-payment-intent', async (req, res) => {
            try {
                const { price, trainerId } = req.body;
                const amount = parseInt(price * 100);
                const userId = trainerId
                console.log(trainerId);
                const lastPayment = paymentHistory.find(payment => {
                    return (
                        payment.userId === userId &&
                        new Date(payment.timestamp).getMonth() === new Date().getMonth()
                    );
                });

                if (lastPayment) {
                    // User has already made a payment in the current month
                    return res.status(400).send({ error: 'User has already made a payment this month' });
                }

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card']
                });
                paymentHistory.push({
                    userId: userId,
                    timestamp: new Date().toISOString(),
                    amount: amount
                });

                res.send({
                    clientSecret: paymentIntent.client_secret
                });
            } catch (error) {
                console.error('Error creating payment intent:', error);
                res.status(500).send({ error: 'Error creating payment intent' });
            }
        });









        //  user login and user data database add


        // app.post('/users', async (req, res) => {
        //     const user = req.body;
        //     const result = await usersCollection.insertOne(user);
        //     res.send(result)
        // })

        app.post("/users", async (req, res) => {
            const user = req.body
            const qurey = { email: user.email }
            const existinUser = await usersCollection.findOne(qurey)
            if (existinUser) {
                return res.send({ messege: " user alredy exist", insertedId: null })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })














        app.get("/allSubscriber", async (req, res) => {
            const cursor = newsletterCollection.find();
            const result = await cursor.toArray()
            res.send(result)
        })

        app.post('/newsLetter', async (req, res) => {
            const newsLetter = req.body;
            const result = await newsletterCollection.insertOne(newsLetter);
            res.send(result)
        })


        //  infinity img Scroll

        app.get("/infinityImg", async (req, res) => {
            const cursor = infinityCollection.find();
            const result = await cursor.toArray()
            res.send(result)
        })

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World! job owner Your well Come ')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
