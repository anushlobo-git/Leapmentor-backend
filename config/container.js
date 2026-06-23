/**
 * @fileoverview Dependency Injection Container
 * @description Centralized wiring point for the entire application graph.
 * This is the ONLY file allowed to require models, repositories, and services directly.
 */

// 1. Import Infrastructure Singletons (Exempt from DI)
// const db = require('./db'); // Un-comment when ready

// 2. Import Mongoose Models
const UserModel = require("../models/User");







// 3. Import Repository Factories
const createUserRepository = require("../repositories/user.repository");






// WIRING SUB-SYSTEM

// Instantiate Repositories by injecting their respective models
const userRepository = createUserRepository(UserModel);

// (Future Services will be instantiated here by injecting repositories)



// CONTAINER EXPORTS
module.exports = {
  userRepository,
  // Future instances will be added here one-by-one
};
