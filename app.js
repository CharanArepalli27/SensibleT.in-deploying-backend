const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const uuid = require("uuid");
const path = require("path");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "transaction.db");
const PORT = process.env.PORT || 3000;
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () => {
      console.log("Sever is Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//!API for Getting all the transactions
app.get("/api/transactions", async (request, response) => {
  const gettingTransactionQuery = `SELECT * from transactions`;
  const allTransactions = await db.all(gettingTransactionQuery);
  response.send(allTransactions);
});

//!API for Deleting an Transaction
app.delete("/api/transactions/:transaction_id", async (request, response) => {
  const { transaction_id } = request.params;
  try {
    const deletingTransactionQuery = `DELETE FROM transactions WHERE transaction_id = ?`;
    const result = await db.run(deletingTransactionQuery, transaction_id);
    response.send({
      status: "success",
      message: "Transaction Deleted Successfully",
    });
  } catch (error) {
    response.status(500).send({ status: "error", message: error.message });
  }
});

//!API for adding a new transaction
app.post("/api/transactions", async (request, response) => {
  const { amount, transaction_type, user_id } = request.body;
  if (!amount || !transaction_type || !user_id) {
    response.status(400);
    return response.send("Missing the required fields");
  }
  if (amount <= 0) {
    return response.send({
      status: "error",
      message: "Amount must be a positive number",
    });
  }
  const allowedTypes = ["DEPOSIT", "WITHDRAWAL"];
  if (!allowedTypes.includes(transaction_type.toUpperCase())) {
    response.status(400);
    return response.send({
      status: "error",
      message: "Invalid transaction type",
    });
  }
  const transaction_id = uuid.v4();
  const status = "PENDING";
  const timestamp = new Date().toISOString();
  const addingNewTransactionQuery = `INSERT INTO transactions(transaction_id,amount, transaction_type, user_id,timestamp,status) VALUES ("${transaction_id}","${amount}","${transaction_type}","${user_id}","${timestamp}","${status}")`;
  await db.run(addingNewTransactionQuery);
  response.send("Transaction Added Successfully");
});

//!API for getting Transactions based on TransactionId
app.get("/api/transactions/:transaction_id", async (request, response) => {
  const { transaction_id } = request.params;
  try {
    const gettingSpecificTransactionQuery = `SELECT * FROM transactions WHERE transaction_id = ?`;
    const transaction = await db.get(
      gettingSpecificTransactionQuery,
      transaction_id
    );
    if (!transaction) {
      response.status(404);
      return response.send({
        status: "error",
        message: "Transaction not found",
      });
    }
    response.send(transaction);
  } catch (error) {
    response.status(500);
    response.send({ status: "error", message: error.message });
  }
});

//! API for getting Transactions based on Specific User
app.get("/api/transactions/user/:user_id", async (request, response) => {
  const { user_id } = request.params;
  try {
    const gettingUserTransactionsQuery = `SELECT * FROM transactions WHERE user_id = ?`;
    const transactions = await db.all(gettingUserTransactionsQuery, user_id);
    if (transactions.length === 0) {
      response.status(404);
      return response.send({
        status: "error",
        message: "No transactions found for the given user ID",
      });
    }

    response.send(transactions);
  } catch (err) {
    response.status(500);
    response.send({ status: "error", message: err.message });
  }
});

//!API for updating status of the transaction
app.put("/api/transactions/:transaction_id", async (request, response) => {
  const { status } = request.body;
  const { transaction_id } = request.params;
  const allowedStatuses = ["PENDING", "COMPLETED", "FAILED"];
  if (!allowedStatuses.includes(status.toUpperCase())) {
    response.status(400);
    return response.send({ status: "error", message: "Invalid status value" });
  }
  try {
    const updatingTransactionQuery = `UPDATE transactions SET status = ? WHERE transaction_id = ?`;
    const result = await db.run(
      updatingTransactionQuery,
      status,
      transaction_id
    );
    if (result.changes === 0) {
      response.status(404);
      return response.send({
        status: "error",
        message: "Transaction not found",
      });
    }
    response.send({
      status: "success",
      message: "Transaction updated successfully",
    });
  } catch (error) {
    response.status(500);
    response.send({ status: "error", message: err.message });
  }
});
module.exports = app;
