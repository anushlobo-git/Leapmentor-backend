/**
 * @fileoverview Goal Repository
 * @description Encapsulates standard data retrieval wrappers using parameter model dependency injection.
 */

const createGoalRepository = (Goal) => {
  const findOneByConnectRequest = (connectRequestId) =>
    Goal.findOne({ connectRequest: connectRequestId });

  const findOneByConnectRequestLean = (connectRequestId) =>
    Goal.findOne({ connectRequest: connectRequestId }).lean();

  const create = (data) => Goal.create(data);

  const findById = (id) => Goal.findById(id);

  const save = (goalInstance) => goalInstance.save();

  return {
    findOneByConnectRequest,
    findOneByConnectRequestLean,
    create,
    findById,
    save,
  };
};

module.exports = createGoalRepository;
