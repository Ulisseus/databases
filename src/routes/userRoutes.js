const {
  sendPasswordResetEmail,
  signUp,
  logIn,
  resetUserPassword,
  setDBPassword,
} = require("../../lib/users");

const logger = require("../../lib/log")(__filename);
const db = require("../../sequelize/db");
const pgModule = require("../../database/postgres/pg");
const routes = {};

routes.resetPasswordEmail = async (req, res) => {
  const email = req.body.email;
  const username = req.body.username;
  if (!email && !username) {
    return res.status(400).json({ error: { message: "invalid input" } });
  }
  const query = { where: {} };
  if (email) {
    query.where.email = email;
  } else {
    query.where.username = username;
  }
  const { Accounts } = db.getModels();
  const userAccount = await Accounts.findOne(query);
  if (!userAccount) {
    return res
      .status(400)
      .json({ error: { message: "Account does not exist" } });
  }
  logger.info(
    `User account found for user ${userAccount.id}, sending email now`
  );
  try {
    const account = await sendPasswordResetEmail(userAccount);
    logger.info(`user reset password email sent to user ${userAccount.id}`);
    return res.status(200).json({ ...account.dataValues, password: null });
  } catch (err) {
    logger.error(`Could not send email to user ${userAccount.id}`);
    return res
      .status(500)
      .json({ error: { message: "Email delivery failed. Please try again" } });
  }
};

routes.createUser = async (req, res) => {
  const userInfo = {
    username: req.body.username,
    email: req.body.email,
  };
  try {
    const account = await signUp(userInfo);
    logger.info("Succeded creating user account", userInfo.username);
    return res.status(200).json({ ...account.dataValues });
  } catch (err) {
    logger.error("Creating user failed", userInfo.username, err);
    return res.status(400).json({ error: { message: err.message } });
  }
};

routes.deleteUser = async (req, res) => {
  if (!req.params.id) {
    logger.info("user id was not provided");
    return res
      .status(400)
      .json({ error: { message: "user id was not provided" } });
  }
  const { Accounts } = db.getModels();
  try {
    const account = await Accounts.findOne({
      where: {
        id: req.params.id,
      },
    });
    if (!account) {
      logger.info("Cannot find user", req.params.id);
      return res.status(404).json({ error: { message: "Cannot find user" } });
    }
    if (account.id !== req.session.userid) {
      logger.error(
        "Username does not match to cookie",
        account.id,
        req.session.userid
      );
      return res
        .status(403)
        .json({ error: { message: "Username does not match to cookie" } });
    }
    await account.destroy();
    logger.info("Succeded deleting user account", req.params.id);
    return res.status(200).json({ ...account.dataValues, password: null });
  } catch (err) {
    logger.error("Deleting user failed", req.params.id, err);
    res
      .status(500)
      .json({ error: { message: "Deleting user failed. Please try again" } });
  }
};

routes.loginUser = async (req, res) => {
  const userInfo = {
    username: req.body.username,
    password: req.body.password,
    email: req.body.email,
  };
  try {
    const account = await logIn(userInfo);
    req.session.userid = account.id;
    req.session.username = account.username;
    logger.info("Logged in", account.username);
    return res.status(200).json({ ...account.dataValues, password: null });
  } catch (err) {
    logger.info(err);
    return res
      .status(500)
      .json({ error: { message: "Login user failed. Please try again" } });
  }
};
routes.updateDBPassword = async (req, res) => {
  const id = req.session.userid;
  const password = req.body.password;
  if (!id || !password) {
    logger.info("invalid input");
    return res
      .status(400)
      .json({ error: { message: "invalid input of username and password" } });
  }
  const { Accounts } = db.getModels();
  const userAccount = await Accounts.findOne({
    where: {
      id: id,
    },
  });
  if (!userAccount) {
    logger.info(`account does not exist`);
    res.status(400).json({ error: { message: "account does not exist" } });
    return;
  }
  try {
    const updatedAccount = await setDBPassword(userAccount, password);
    logger.info(`user ${userAccount.id} updates password`);
    return res
      .status(200)
      .json({ ...updatedAccount.dataValues, password: null });
  } catch (err) {
    logger.error("Password update failed. Please try again", id, err);
    return res
      .status(500)
      .json({ error: { message: "Password update failed. Please try again" } });
  }
};

routes.logoutUser = (req, res) => {
  req.session.userid = "";
  req.session.username = "";

  logger.info("user logged out");
  return res.status(200).json({
    message: `Logout succeeded`,
  });
};

routes.userResetPassword = async (req, res) => {
  const token = req.body.token;
  const password = req.body.password;

  try {
    const account = await resetUserPassword(token, password);
    logger.info("User password reset for", account.username);
    req.session.userid = account.id;
    return res.status(200).json({ ...account.dataValues, password: null });
  } catch (err) {
    logger.error("user reset password error:", err);
    return res.status(500).json({
      error: { message: "Reset user password failed. Please try again" },
    });
  }
};

routes.createDatabase = async (req, res) => {
  if (!req.session.username) {
    logger.info("User must be signed in to create database");
    return res.status(403).json({
      error: { message: "You must be signed in to create a database" },
    });
  }

  const { Accounts } = db.getModels();
  const user = await Accounts.findOne({
    where: { username: req.session.username },
  });

  const { username, dbPassword } = user;

  if (!dbPassword) {
    logger.info("User must use password to create database");
    return res.status(400).json({
      error: {
        message: "You must use your database password to create a database",
      },
    });
  }

  try {
    await pgModule.createPgAccount(username, dbPassword);

    return res
      .status(200)
      .json({ success: { message: "Create Database success" } });
  } catch (err) {
    logger.error("Error with creating database:", err);
    return res
      .status(501)
      .json({ error: { message: "Database creation was not implemented" } });
  }
};

module.exports = routes;
