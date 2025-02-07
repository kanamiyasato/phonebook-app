const express = require("express");
const app = express();
const morgan = require("morgan");

const Person = require("./models/person");

app.use(express.static("dist"));

const requestLogger = (request, response, next) => {
  console.log("Method:", request.method);
  console.log("Path:  ", request.path);
  console.log("Body:  ", request.body);
  console.log("---");
  next();
};

const errorHandler = (error, request, response, next) => {
  console.error(error.message);

  if (error.name === "CastError") {
    return response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  }

  next(error);
};

const cors = require("cors");

app.use(cors());

app.use(morgan("tiny"));
app.use(express.json());
app.use(requestLogger);

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

app.get("/", (request, response) => {
  response.send("<h1>Homepage</h1>");
});

app.get("/api/persons", (request, response) => {
  Person.find({}).then((persons) => {
    response.json(persons);
  });
});

app.get("/api/persons/:id", (request, response) => {
  Person.findById(request.params.id).then((person) => {
    response.json(person);
  });
});

morgan.token("content", function (req, res) {
  return JSON.stringify(req.body);
});
app.use(
  morgan(
    ":method :url :status :res[content-length] - :response-time ms :content"
  )
);

app.post("/api/persons", (request, response, next) => {
  const body = request.body;
  const newName = body.name;
  const newNumber = body.number;

  if (!newName || !newNumber) {
    return response.status(400).json({
      error: "content missing",
    });
  }

  const person = new Person({
    name: newName,
    number: newNumber,
  });

  person.save()
    .then((savedPerson) => {
      response.json(savedPerson);
    })
    .catch((error) => next(error));
});

app.put("/api/persons/:id", async (request, response, next) => {
  try {
    const { name, number } = request.body;
    
    const personFound = await Person.findById(request.params.id);
    
    if (!personFound) {
      return response.status(400).json({ error: "Entry no longer exists in database" });
    }

    const updatedPerson = await Person.findByIdAndUpdate(
      request.params.id,
      { name, number },
      { new: true, runValidators: true, context: "query" }
    );

    response.json(updatedPerson);
  } catch (error) {
    next(error);
  }
});


app.delete("/api/persons/:id", (request, response) => {
  Person.findByIdAndDelete(request.params.id)
    .then((result) => {
      response.status(204).end();
    })
    .catch((error) => next(error));
});

app.get("/info", (request, response) => {
  const timestamp = new Date();

  Person.find({}).then((persons) => {
    const content = `Phonebook has info for ${persons.length} people<br><br>${timestamp}`;
    response.send(`<p>${content}</p>`);
  });
});

app.use(unknownEndpoint);
app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
