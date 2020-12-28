import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/happyThoughts"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const Thought = mongoose.model('Thought', {
  message: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 140
  },
  hearts: {
    type: Number,
    default: 0
  },
  name: {
    type: String,
    default: "Anonymous"
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  }
})

/*
ATT GÖRA
- Red level - name 
- infinate scroll instad of limit 20. (black)
- filter and sorting (black)
- create error messages as variables 
*/


// Defines the port the app will run on. Defaults to 8080, but can be 
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

//____________Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

//_____________Different error messages
const SERVICE_UNAVAILABLE = "service unavailable"
const BAD_REQUEST = "Bad request"
const SAVE_POST_FAILED = "Could not save thought"


const listEndpoints = require('express-list-endpoints')

//_____________Error message in case server is down
app.use((req, res, next) => {
  if(mongoose.connection.readyState === 1) {
    next();
  } else {
    res
    .status(503)
    .send({ error: SERVICE_UNAVAILABLE});
  };
});

//____________Defining routes
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

//____________List all thoughts
app.get('/thoughts', async (req, res) => {
  const thoughts = await Thought.find().sort({ createdAt: -1 }).limit(20).exec()
  //'desc' instead of -1
  if (thoughts) {
    res.status(200).send(thoughts)
  } else {
    res.status(400).send({ error: BAD_REQUEST, error: err.errors })
  }
})

//____________Post a thought
app.post('/thoughts', async (req, res) => {
  try {
    //success
    const thought = await new Thought({ message: req.body.message }).save()
    res.status(201).send(thought)
  } catch (err) {
    //bad request
    res.status(400).send({ message: SAVE_POST_FAILED, errors: err.errors })
  }
})

//____________Like a thought
app.post('/thoughts/:id/like', async (req, res) => {
  const { id } = req.params
  try {
    await Thought.updateOne({ _id: id }, { $inc: { hearts: 1 }})
    res.status(201).send()
  } catch (err) {
    res.status(400).send({ message: `${id} was not found` })
  }
})

//____________Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
