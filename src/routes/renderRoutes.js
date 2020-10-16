const db = require("../../sequelize/db");
const es = require("../../database/elasticsearch/elastic");
const pg = require("../../database/postgres/pg");
const arangoModule = require("../../database/arango/arango");
require("dotenv").config();
const routes = {};
// This is the 'host' url for a person's database credentials
const dbHost = {
  Postgres: process.env.HOST,
  Elasticsearch: process.env.ES_HOST,
  Arango: process.env.ARANGO_URL,
};

const CIHost = {
  Postgres: "learndatabases.dev",
  Elasticsearch: "elastic.learndatabases.dev",
  Arango: "arangodb.learndatabases.dev",
};

const checkAccount = {
  Postgres: pg.userHasPgAccount,
  Elasticsearch: es.checkAccount,
  Arango: arangoModule.checkIfDatabaseExists,
};

const CI = () => process.env.NODE_ENV === "CI";

// If you are here because you are implementing another database, then
// just add to the hashtables above! No need to touch down here.
routes.database = async (req, res) => {
  const { email, userid } = req.session;
  const { database } = req.params;
  const { Accounts } = db.getModels();

  const user = userid && (await Accounts.findOne({ where: { id: userid } }));
  const { username, dbPassword } = user || {};
  const renderData = { email, username, dbPassword, database };
  renderData.dbHost = CI() ? CIHost[database] : dbHost[database];
  renderData.dbExists = username && (await checkAccount[database](user));

  res.render("tutorial", renderData);
};

module.exports = routes;
