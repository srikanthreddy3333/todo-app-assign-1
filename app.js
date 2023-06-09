const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
var isValid = require("date-fns/isValid");

const path = require("path");
const app = express();
app.use(express.json());

const databasePath = path.join(__dirname, "todoApplication.db");
let database = null;
const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Db Error :{error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const convertTodoObToResponseOb = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    category: dbObject.category,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

const hasStatusProperties = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperties = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasSearchProperty = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const hasCategoryAndStatus = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriority = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

//API 1
app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q, priority, status, category } = request.query;

  //switch case
  switch (true) {
    //scenario 1 list of all todos whose status is 'TO DO'
    case hasStatusProperties(request.query):
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        getTodosQuery = `SELECT * FROM todo WHERE status ='${status}';`;
        data = await database.all(getTodosQuery);
        response.send(
          data.map((eachItem) => convertTodoObToResponseOb(eachItem))
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    //scenario 2 list of all todos whose priority is 'HIGH'
    case hasPriorityProperties(request.query):
      if (priority === "HIGH") {
        getTodosQuery = `
      SELECT * FROM todo WHERE priority = '${priority}';`;
        data = await database.all(getTodosQuery);
        response.send(
          data.map((eachItem) => convertTodoObToResponseOb(eachItem))
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    //scenario 3 list of all todos whose priority is 'HIGH' and status is 'IN PROGRESS'
    case hasPriorityAndStatusProperties(request.query):
      if (priority === "HIGH") {
        if (status === "IN PROGRESS") {
          getTodosQuery = `
                   SELECT * 
                   FROM todo 
                   WHERE priority='${priority}' AND status="${status};`;
          data = await database.all(getTodosQuery);
          response.send(
            data.map((eachItem) => {
              convertTodoObToResponseOb(eachItem);
            })
          );
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    //scenario 4 list of all todos whose todo contains 'Buy' text
    case hasSearchProperty(request.query):
      getTodosQuery = `select * from todo where todo like '%${search_q}%';`;
      data = await database.all(getTodosQuery);
      response.send(
        data.map((eachItem) => convertTodoObToResponseOb(eachItem))
      );
      break;

    //scenario 5 list of all todos whose category is 'WORK' and status is 'DONE'
    case hasCategoryAndStatus(request.query):
      if (category === "WORK") {
        if (status === "Done") {
          getTodosQuery = `
            SELECT * 
            FROM todo 
            WHERE category = '${category}' AND status = '${status}';`;
          data = await database.all(getTodosQuery);
          response.send(
            data.map((eachItem) => {
              convertTodoObToResponseOb(eachItem);
            })
          );
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    //scenario 6 list of all todos whose category is 'HOME'
    case hasCategoryProperty(request.query):
      if (category === "HOME") {
        getTodosQuery = `SELECT * FROM todo WHERE category='${category}';`;
        data = await database.all(getTodosQuery);
        response.send(
          data.map((eachItem) => convertTodoObToResponseOb(eachItem))
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    //scenario 7 list of all todos whose category is 'LEARNING' and priority is 'HIGH'
    case hasCategoryAndPriority(request.query):
      if (category === "LEARNING") {
        if (priority === "HIGH") {
          getTodosQuery = `
                  SELECT * FROM todo WHERE category='${category} AND priority='${priority}';`;
          data = await database.all(getTodosQuery);
          response.send(
            data.map((eachItem) => convertTodoObToResponseOb(eachItem))
          );
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

    default:
      getTodosQuery = `SELECT * FROM todo;`;
      data = await database.all(getTodosQuery);
      response.send(
        data.map((eachItem) => convertTodoObToResponseOb(eachItem))
      );
  }
});

//API 2 specific todo based on the todo ID
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id =${todoId};`;
  const todoArray = await database.get(getTodoQuery);
  response.send(convertTodoObToResponseOb(todoArray));
});

//api 3 list of all todos with a specific due date in the query parameter
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (date === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const isDateValid = isValid(new Date(date));
    if (isDateValid) {
      const formattedDate = format(new Date(date), "yyyy-MM-dd");

      const getQuery = `
        SELECT 
          id,todo,priority,status,category,due_date AS dueDate 
        FROM 
          todo
        WHERE due_date='${formattedDate}';`;

      const todos = await database.all(getQuery);
      //   response.send(todos);
      response.send(todos.map((each) => convertTodoObToResponseOb(each)));
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

//API 4 Create a todo in the todo table
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (isMatch(dueDate, "yyyy-MM-dd")) {
          const postNewDueDate = format(new Date(dueDate), "yyyy-MM-dd");
          const postTodoQuery = `
            INSERT INTO
                todo (id, todo, category,priority, status, due_date)
            VALUES
                (${id}, '${todo}', '${category}','${priority}', '${status}', '${postNewDueDate}');`;
          await database.run(postTodoQuery);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
});

//API 5 Updates the details of a specific todo based on the todo ID
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const requestBody = request.body;
  const previousTodoQuery = `
  SELECT * 
  FROM todo 
  WHERE id=${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;

  let updateTodoQuery;

  switch (true) {
    //scenario 1 status update
    case requestBody.status !== undefined:
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        updateTodoQuery = `
            UPDATE 
              todo 
            SET
              todo='${todo}',
              priority='${priority}',
              status='${status}',
              category='${category}',
              due_date='${dueDate}'
            WHERE id =${todoId};`;
        await database.run(updateTodoQuery);
        response.send("Status Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    //scenario 2 priority update
    case requestBody.priority !== undefined:
      if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
        updateTodoQuery = `
            UPDATE 
              todo 
            SET
              todo='${todo}',
              priority='${priority}',
              status='${status}',
              category='${category}',
              due_date='${dueDate}'
            WHERE id =${todoId};`;
        await database.run(updateTodoQuery);
        response.send("Priority Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    //scenario 3 todo updated
    case requestBody.todo !== undefined:
      updateTodoQuery = `
            UPDATE 
              todo 
            SET
              todo='${todo}',
              priority='${priority}',
              status='${status}',
              category='${category}',
              due_date='${dueDate}'
            WHERE id =${todoId};`;
      await database.run(updateTodoQuery);
      response.send("Todo Updated");

      break;

    //scenario 4 category updated
    case requestBody.category !== undefined:
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        updateTodoQuery = `
            UPDATE 
              todo 
            SET
              todo='${todo}',
              priority='${priority}',
              status='${status}',
              category='${category}',
              due_date='${dueDate}'
            WHERE id =${todoId};`;
        await database.run(updateTodoQuery);
        response.send("Category Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    //scenario 5 due date update
    case requestBody.dueDate !== undefined:
      if (isMatch(dueDate, "yyyy-MM-dd")) {
        const newDueDate = format(new Date(dueDate), "yyyy-MM-dd");
        updateTodoQuery = `
            UPDATE 
              todo 
            SET
              todo='${todo}',
              priority='${priority}',
              status='${status}',
              category='${category}',
              due_date='${newDueDate}'
            WHERE id =${todoId};`;
        await database.run(updateTodoQuery);
        response.send("Due Date Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo DueDate");
      }
      break;
  }
});

//API 6 Deletes a todo from the todo table based on the todo ID
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id =${todoId};`;
  await database.get(deleteTodoQuery);
  response.send("Todo Deleted");
});
