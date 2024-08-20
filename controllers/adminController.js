const createError = require("http-errors");
const ScriptError = require("../models/scriptErrorModel");
const ScriptLog = require("../models/scriptLogModel");
const Setting = require("../models/settingModel");

/*
  @api:       GET /api/admin/..
  @desc:      admin logs
  @access:    public
*/
const getDataScriptLogs = async (req, res) => {
  const logs = await ScriptLog.find().sort({ time: -1 }).limit(100);
  return res.status(200).json(logs);
};

/*
  @api:       GET /api/admin/..
  @desc:      admin errors
  @access:    public
*/
const getDataScriptErrors = async (req, res) => {
  const logs = await ScriptError.find().sort({ time: -1 }).limit(100);
  return res.status(200).json(logs);
};

/*
  @api:       GET /api/admin/..
  @desc:      admin settings
  @access:    public
*/
const getSettings = async (req, res) => {
  const data = await Setting.find();
  return res.status(200).json(data);
};

module.exports = {
  getDataScriptLogs,
  getDataScriptErrors,
  getSettings,
};
