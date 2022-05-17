/* global describe it beforeEach ethers */
const { expect } = require('chai');

let FeeDistribution;

describe('Treasury/FeeDistribution', () => {
  beforeEach(async () => {
    const FeeDistribution = await ethers.getContractFactory('FeeDistribution');

    FeeDistribution = await FeeDistribution.deploy(
      (await ethers.getSigners())[0].address,
    );
  });

  

});
