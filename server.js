import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/happyThoughts"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

//___________________Model
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

//___________________Defines port app till run on
const port = process.env.PORT || 8080
const app = express()

//___________________Middleweares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())
const listEndpoints = require('express-list-endpoints')

//___________________Error messages
const SERVICE_UNAVAILABLE = "service unavailable"
const BAD_REQUEST = "Bad request"
const POST_THOUGHT_FAILED = "Could not save thought"
const ID_NOT_FOUND = "Thought ID was not found"

//___________________Error messages if server is not connected
app.use((req, res, next) => {
  if(mongoose.connection.readyState === 1) {
    next();
  } else {
    res
    .status(503)
    .send({ error: SERVICE_UNAVAILABLE});
  };
});

//___________________Defining routes
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

//___________________GET all thoughts
app.get('/thoughts', async (req, res) => {
  const { sort, page } = req.query

  const pageNumber = +page || 1; 
  const pageSize = 8 * pageNumber;
  
  const totalThoughts = await Thought.find();
  const numberOfThoughts = totalThoughts.length
  
  const sortThoughts = (sort) => {
    if (sort === "likes") {
      return { hearts: -1 }  
    }
    else if (sort === "oldest") {
      return { createdAt: 1 }
    }
    else {
     return { createdAt: - 1 }
    }
  } 

  const thoughts = await Thought.find()
    .sort(sortThoughts(sort))
    .limit(pageSize)
    .exec()

    if (thoughts) {
    res.status(200).send({total: numberOfThoughts, results: thoughts})
  } else {
    res.status(400).send({ error: BAD_REQUEST, error: err.errors })
  }
})

//___________________POST thought
app.post('/thoughts', async (req, res) => {
  const { name, message } = req.body
  try {
    const thought = await new Thought({ message: message, name: name}).save()
    res.status(201).send(thought)
  } catch (err) {
    res.status(400).send({ message: POST_THOUGHT_FAILED, errors: err.errors })
  }
})

//___________________POST a thought-like
app.post('/thoughts/:id/like', async (req, res) => {
  const { id } = req.params
  try {
    await Thought.updateOne({ _id: id }, { $inc: { hearts: 1 }})
    res.status(201).send()
  } catch (err) {
    res.status(400).send({ message: ID_NOT_FOUND })
  }
})

//___________________Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})