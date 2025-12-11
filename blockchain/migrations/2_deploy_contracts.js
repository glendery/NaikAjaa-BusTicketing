const BusTicket = artifacts.require("BusTicket");

module.exports = function (deployer) {
  deployer.deploy(BusTicket);
};  