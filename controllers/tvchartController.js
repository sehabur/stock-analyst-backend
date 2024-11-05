const url = require("url");
const createError = require("http-errors");
const StudyTemplate = require("../models/studyTemplateModel");
const Chart = require("../models/chartModel");
const mongoose = require("mongoose");
const { checkIsPremiumEligible } = require("../helper/users");

/*
  @api:       POST /api/tvcharts/getStudyTemplate/
  @desc:      get all Study Template
  @access:    private
*/
const getStudyTemplate = async (req, res) => {
  const { getType, name } = url.parse(req.url, true).query;

  const { id, isPremium, premiumExpireDate } = req.user;

  const isPremiumEligible = checkIsPremiumEligible(
    isPremium,
    premiumExpireDate
  );

  let data;
  if (getType === "all") {
    if (isPremiumEligible) {
      data = await StudyTemplate.find({
        $or: [{ user: id }, { isPublic: true }],
      });
    } else {
      data = await StudyTemplate.find({
        $or: [{ user: id }, { isPublic: true, isPremium: false }],
      });
    }
  } else if (getType === "content") {
    data = await StudyTemplate.findOne({ name }).select(
      "name content meta_info -_id"
    );
  }
  return res.status(200).json(data);
};

const saveStudyTemplate = async (req, res) => {
  const body = req.body;
  const data = await StudyTemplate.create({ ...body, user: req.user.id });
  return res.status(201).json(data);
};

const removeStudyTemplate = async (req, res) => {
  const { name } = url.parse(req.url, true).query;

  const data = await StudyTemplate.findOneAndDelete({
    user: req.user.id,
    name,
  }).select("name content meta_info -_id");

  return res.status(200).json(data);
};

const getChart = async (req, res) => {
  const { getType, id } = url.parse(req.url, true).query;

  let data;
  if (getType === "all") {
    data = await Chart.find({
      $or: [{ user: req.user.id }, { isPublic: true }],
    });
  } else if (getType === "content") {
    data = await Chart.findById(id);
  }
  return res.status(200).json(data);
};

const saveChart = async (req, res) => {
  const body = req.body;

  const objectId = new mongoose.mongo.ObjectId();

  const data = await Chart.create({
    ...body,
    _id: objectId,
    id: objectId,
    user: req.user.id,
  });

  return res.status(201).json(data);
};

const removeChart = async (req, res) => {
  const { id } = url.parse(req.url, true).query;

  await Chart.findByIdAndDelete(id);

  return res.status(200).json("chart removed");
};

module.exports = {
  getStudyTemplate,
  saveStudyTemplate,
  removeStudyTemplate,
  getChart,
  saveChart,
  removeChart,
};
