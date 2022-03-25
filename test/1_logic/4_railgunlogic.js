/* global describe it beforeEach overwriteArtifact ethers */
const { expect } = require('chai');

const poseidonGenContract = require('circomlib/src/poseidon_gencontract');
const {
  MerkleTree, Note, prover, utils,
} = require('railgun-privacy.js');

const verificationKey = require('../../verificationKey');

const privateKey = utils.genRandomPrivateKey();
const publicKey = utils.genPublicKey(privateKey);
const railgunAccount = {
  privateKey: utils.bigInt2Buffer(privateKey),
  publicKey: utils.packPoint(publicKey),
};

let railgunLogic;
let testERC20;

describe('Logic/RailgunLogic', () => {
  beforeEach(async () => {
    // Deploy test token
    const TestERC20 = await ethers.getContractFactory('TestERC20');
    testERC20 = await TestERC20.deploy();

    const PoseidonT3 = await ethers.getContractFactory('PoseidonT3');
    const poseidonT3 = await PoseidonT3.deploy();
    const PoseidonT6 = await ethers.getContractFactory('PoseidonT6');
    const poseidonT6 = await PoseidonT6.deploy();

    // Deploy Railgun Logic
    const RailgunLogic = await ethers.getContractFactory('RailgunLogic', {
      libraries: {
        PoseidonT3: poseidonT3.address,
        PoseidonT6: poseidonT6.address,
      },
    });

    railgunLogic = await RailgunLogic.deploy();

    await railgunLogic.initializeRailgunLogic(
      verificationKey.vKeySmall,
      verificationKey.vKeyLarge,
      [],
      (await ethers.getSigners())[1].address,
      0n,
      0n,
      0n,
      (await ethers.getSigners())[0].address,
      { gasLimit: 2000000 },
    );
  });

  it('Should verify proofs', async () => {
    const merkleTree = new MerkleTree();

    const outputNote = Note.generateNote(railgunAccount.publicKey, 100n, testERC20.address);

    const proof = await prover.generateProof({
      merkleTree,
      depositAmount: 100n,
      outputs: [
        outputNote,
      ],
    });

    expect(await prover.verifyProof(proof)).to.equal(true);

    const txResult = await railgunLogic.verifyProof(
      // Proof
      proof.proof.solidity,
      // Shared
      proof.publicInputs.adaptID.address,
      proof.publicInputs.adaptID.parameters,
      proof.publicInputs.depositAmount,
      proof.publicInputs.withdrawAmount,
      proof.publicInputs.outputTokenField,
      proof.publicInputs.outputEthAddress,
      // Join
      proof.publicInputs.treeNumber,
      proof.publicInputs.merkleRoot,
      proof.publicInputs.nullifiers,
      // Split
      proof.publicInputs.commitments,
    );

    expect(txResult).to.equal(true);
  });

  it('Should deposit token correctly', async () => {
    const merkleTree = new MerkleTree();

    const outputNote = Note.generateNote(railgunAccount.publicKey, 100n, testERC20.address);

    const proof = await prover.generateProof({
      merkleTree,
      depositAmount: 100n,
      outputs: [
        outputNote,
      ],
    });

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    expect(await prover.verifyProof(proof)).to.equal(true);

    await railgunLogic.transact(
      [{
      // Proof
        proof: proof.proof.solidity,
        // Shared
        adaptIDcontract: proof.publicInputs.adaptID.address,
        adaptIDparameters: proof.publicInputs.adaptID.parameters,
        depositAmount: proof.publicInputs.depositAmount,
        withdrawAmount: proof.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof.publicInputs.outputTokenField,
        outputEthAddress: proof.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof.publicInputs.treeNumber,
        merkleRoot: proof.publicInputs.merkleRoot,
        nullifiers: proof.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );
  });

  it('Should deposit with 2 outputs correctly', async () => {
    const merkleTree = new MerkleTree();

    const outputNote = Note.generateNote(railgunAccount.publicKey, 30n, testERC20.address);
    const outputNote2 = Note.generateNote(railgunAccount.publicKey, 70n, testERC20.address);

    const proof = await prover.generateProof({
      merkleTree,
      depositAmount: 100n,
      outputs: [
        outputNote,
        outputNote2,
      ],
    });

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    expect(await prover.verifyProof(proof)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof.proof.solidity,
        // Shared
        adaptIDcontract: proof.publicInputs.adaptID.address,
        adaptIDparameters: proof.publicInputs.adaptID.parameters,
        depositAmount: proof.publicInputs.depositAmount,
        withdrawAmount: proof.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof.publicInputs.outputTokenField,
        outputEthAddress: proof.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof.publicInputs.treeNumber,
        merkleRoot: proof.publicInputs.merkleRoot,
        nullifiers: proof.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );
  });

  it('Should deposit with 3 outputs correctly', async () => {
    const merkleTree = new MerkleTree();

    const outputNote = Note.generateNote(railgunAccount.publicKey, 40n, testERC20.address);
    const outputNote2 = Note.generateNote(railgunAccount.publicKey, 120n, testERC20.address);
    const outputNote3 = Note.generateNote(railgunAccount.publicKey, 80n, testERC20.address);

    const proof = await prover.generateProof({
      merkleTree,
      depositAmount: 240n,
      outputs: [
        outputNote,
        outputNote2,
        outputNote3,
      ],
    });

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    expect(await prover.verifyProof(proof)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof.proof.solidity,
        // Shared
        adaptIDcontract: proof.publicInputs.adaptID.address,
        adaptIDparameters: proof.publicInputs.adaptID.parameters,
        depositAmount: proof.publicInputs.depositAmount,
        withdrawAmount: proof.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof.publicInputs.outputTokenField,
        outputEthAddress: proof.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof.publicInputs.treeNumber,
        merkleRoot: proof.publicInputs.merkleRoot,
        nullifiers: proof.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );
  });

  it('Should deposit and withdraw', async () => {
    const merkleTree = new MerkleTree();

    const outputNote = Note.generateNote(railgunAccount.publicKey, 100n, testERC20.address);

    const initialtestERC20Balance = await testERC20.balanceOf(
      (await ethers.getSigners())[0].address,
    );

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    const proof = await prover.generateProof({
      merkleTree,
      depositAmount: 100n,
      outputs: [
        outputNote,
      ],
    });

    expect(await prover.verifyProof(proof)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof.proof.solidity,
        // Shared
        adaptIDcontract: proof.publicInputs.adaptID.address,
        adaptIDparameters: proof.publicInputs.adaptID.parameters,
        depositAmount: proof.publicInputs.depositAmount,
        withdrawAmount: proof.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof.publicInputs.outputTokenField,
        outputEthAddress: proof.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof.publicInputs.treeNumber,
        merkleRoot: proof.publicInputs.merkleRoot,
        nullifiers: proof.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    const proof2 = await prover.generateProof({
      merkleTree,
      notes: [
        outputNote,
      ],
      spendingKeys: [
        railgunAccount.privateKey,
      ],
      withdrawAmount: 100n,
      outputEthAddress: (await ethers.getSigners())[0].address,
    });

    expect(await prover.verifyProof(proof2)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof2.proof.solidity,
        // Shared
        adaptIDcontract: proof2.publicInputs.adaptID.address,
        adaptIDparameters: proof2.publicInputs.adaptID.parameters,
        depositAmount: proof2.publicInputs.depositAmount,
        withdrawAmount: proof2.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof2.publicInputs.outputTokenField,
        outputEthAddress: proof2.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof2.publicInputs.treeNumber,
        merkleRoot: proof2.publicInputs.merkleRoot,
        nullifiers: proof2.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof2.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof2.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    expect(await testERC20.balanceOf((await ethers.getSigners())[0].address))
      .to.equal(initialtestERC20Balance);
  });

  it('Should deposit, do an internal transaction, and withdraw', async () => {
    const merkleTree = new MerkleTree();

    const outputNote1a = Note.generateNote(railgunAccount.publicKey, 100n, testERC20.address);
    const outputNote1b = Note.generateNote(railgunAccount.publicKey, 50n, testERC20.address);

    const initialtestERC20Balance = await testERC20.balanceOf(
      (await ethers.getSigners())[0].address,
    );

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    const proof = await prover.generateProof({
      merkleTree,
      depositAmount: 150n,
      outputs: [
        outputNote1a,
        outputNote1b,
      ],
    });

    expect(await prover.verifyProof(proof)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof.proof.solidity,
        // Shared
        adaptIDcontract: proof.publicInputs.adaptID.address,
        adaptIDparameters: proof.publicInputs.adaptID.parameters,
        depositAmount: proof.publicInputs.depositAmount,
        withdrawAmount: proof.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof.publicInputs.outputTokenField,
        outputEthAddress: proof.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof.publicInputs.treeNumber,
        merkleRoot: proof.publicInputs.merkleRoot,
        nullifiers: proof.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    const outputNote2a = Note.generateNote(railgunAccount.publicKey, 70n, testERC20.address);
    const outputNote2b = Note.generateNote(railgunAccount.publicKey, 80n, testERC20.address);

    const proof2 = await prover.generateProof({
      merkleTree,
      notes: [
        outputNote1a,
        outputNote1b,
      ],
      spendingKeys: [
        railgunAccount.privateKey,
        railgunAccount.privateKey,
      ],
      outputs: [
        outputNote2a,
        outputNote2b,
      ],
    });

    expect(await prover.verifyProof(proof2)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof2.proof.solidity,
        // Shared
        adaptIDcontract: proof2.publicInputs.adaptID.address,
        adaptIDparameters: proof2.publicInputs.adaptID.parameters,
        depositAmount: proof2.publicInputs.depositAmount,
        withdrawAmount: proof2.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof2.publicInputs.outputTokenField,
        outputEthAddress: proof2.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof2.publicInputs.treeNumber,
        merkleRoot: proof2.publicInputs.merkleRoot,
        nullifiers: proof2.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof2.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof2.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    const proof3 = await prover.generateProof({
      merkleTree,
      notes: [
        outputNote2a,
        outputNote2b,
      ],
      spendingKeys: [
        railgunAccount.privateKey,
        railgunAccount.privateKey,
      ],
      withdrawAmount: 150n,
      outputEthAddress: (await ethers.getSigners())[0].address,
    });

    expect(await prover.verifyProof(proof3)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof3.proof.solidity,
        // Shared
        adaptIDcontract: proof3.publicInputs.adaptID.address,
        adaptIDparameters: proof3.publicInputs.adaptID.parameters,
        depositAmount: proof3.publicInputs.depositAmount,
        withdrawAmount: proof3.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof3.publicInputs.outputTokenField,
        outputEthAddress: proof3.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof3.publicInputs.treeNumber,
        merkleRoot: proof3.publicInputs.merkleRoot,
        nullifiers: proof3.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof3.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof3.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    expect(await testERC20.balanceOf((await ethers.getSigners())[0].address))
      .to.equal(initialtestERC20Balance);
  });

  it('Should transact with large circuit', async () => {
    const merkleTree = new MerkleTree();

    const outputNote1a = Note.generateNote(railgunAccount.publicKey, 100n, testERC20.address);
    const outputNote1b = Note.generateNote(railgunAccount.publicKey, 50n, testERC20.address);

    const initialtestERC20Balance = await testERC20.balanceOf(
      (await ethers.getSigners())[0].address,
    );

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    const proof = await prover.generateProof({
      merkleTree,
      depositAmount: 150n,
      outputs: [
        outputNote1a,
        outputNote1b,
      ],
    }, true);

    expect(await prover.verifyProof(proof, true)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof.proof.solidity,
        // Shared
        adaptIDcontract: proof.publicInputs.adaptID.address,
        adaptIDparameters: proof.publicInputs.adaptID.parameters,
        depositAmount: proof.publicInputs.depositAmount,
        withdrawAmount: proof.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof.publicInputs.outputTokenField,
        outputEthAddress: proof.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof.publicInputs.treeNumber,
        merkleRoot: proof.publicInputs.merkleRoot,
        nullifiers: proof.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof.publicInputs.commitments,
      }],
      {
        gasLimit: 12000000,
      },
    );

    merkleTree.insertLeaves(proof.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    const outputNote2a = Note.generateNote(railgunAccount.publicKey, 70n, testERC20.address);
    const outputNote2b = Note.generateNote(railgunAccount.publicKey, 80n, testERC20.address);

    const proof2 = await prover.generateProof({
      merkleTree,
      notes: [
        outputNote1a,
        outputNote1b,
      ],
      spendingKeys: [
        railgunAccount.privateKey,
        railgunAccount.privateKey,
      ],
      outputs: [
        outputNote2a,
        outputNote2b,
      ],
    }, true);

    expect(await prover.verifyProof(proof2, true)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof2.proof.solidity,
        // Shared
        adaptIDcontract: proof2.publicInputs.adaptID.address,
        adaptIDparameters: proof2.publicInputs.adaptID.parameters,
        depositAmount: proof2.publicInputs.depositAmount,
        withdrawAmount: proof2.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof2.publicInputs.outputTokenField,
        outputEthAddress: proof2.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof2.publicInputs.treeNumber,
        merkleRoot: proof2.publicInputs.merkleRoot,
        nullifiers: proof2.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof2.publicInputs.commitments,
      }],
      {
        gasLimit: 12000000,
      },
    );

    merkleTree.insertLeaves(proof2.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    const proof3 = await prover.generateProof({
      merkleTree,
      notes: [
        outputNote2a,
        outputNote2b,
      ],
      spendingKeys: [
        railgunAccount.privateKey,
        railgunAccount.privateKey,
      ],
      withdrawAmount: 150n,
      outputEthAddress: (await ethers.getSigners())[0].address,
    }, true);

    expect(await prover.verifyProof(proof3, true)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof3.proof.solidity,
        // Shared
        adaptIDcontract: proof3.publicInputs.adaptID.address,
        adaptIDparameters: proof3.publicInputs.adaptID.parameters,
        depositAmount: proof3.publicInputs.depositAmount,
        withdrawAmount: proof3.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof3.publicInputs.outputTokenField,
        outputEthAddress: proof3.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof3.publicInputs.treeNumber,
        merkleRoot: proof3.publicInputs.merkleRoot,
        nullifiers: proof3.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof3.publicInputs.commitments,
      }],
      {
        gasLimit: 12000000,
      },
    );

    merkleTree.insertLeaves(proof3.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    expect(await testERC20.balanceOf((await ethers.getSigners())[0].address))
      .to.equal(initialtestERC20Balance);
  });

  it('Should deposit and generate commitments correctly', async () => {
    const merkleTree = new MerkleTree();

    const note = Note.generateNote(railgunAccount.publicKey, 10000n, testERC20.address);

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    const initialBalance = await testERC20.balanceOf(
      (await ethers.getSigners())[0].address,
    );

    await railgunLogic.generateDeposit([{
      pubkey: utils.unpackPoint(railgunAccount.publicKey),
      random: note.random,
      amount: note.amount,
      tokenType: 0n,
      tokenSubID: 0n,
      token: utils.bigInt2ETHAddress(note.token),
    }], {
      gasLimit: 1500000,
    });

    const newBalance = await testERC20.balanceOf(
      (await ethers.getSigners())[0].address,
    );

    expect(BigInt(initialBalance) - BigInt(newBalance)).to.equal(note.amount);

    merkleTree.insertLeaves([note.hash]);

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    await railgunLogic.generateDeposit([{
      pubkey: utils.unpackPoint(railgunAccount.publicKey),
      random: note.random,
      amount: note.amount,
      tokenType: 0n,
      tokenSubID: 0n,
      token: utils.bigInt2ETHAddress(note.token),
    }, {
      pubkey: utils.unpackPoint(railgunAccount.publicKey),
      random: note.random,
      amount: note.amount,
      tokenType: 0n,
      tokenSubID: 0n,
      token: utils.bigInt2ETHAddress(note.token),
    }], {
      gasLimit: 1500000,
    });

    const newBalance2 = await testERC20.balanceOf(
      (await ethers.getSigners())[0].address,
    );

    expect(BigInt(initialBalance) - BigInt(newBalance2)).to.equal(note.amount * 3n);

    merkleTree.insertLeaves([note.hash, note.hash]);

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );
  });

  it('Should be able to spend from generated commitment', async () => {
    const merkleTree = new MerkleTree();

    const note = Note.generateNote(railgunAccount.publicKey, 10000n, testERC20.address);

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    const initialBalance = await testERC20.balanceOf(
      (await ethers.getSigners())[0].address,
    );

    await railgunLogic.generateDeposit([{
      pubkey: utils.unpackPoint(railgunAccount.publicKey),
      random: note.random,
      amount: note.amount,
      tokenType: 0n,
      tokenSubID: 0n,
      token: utils.bigInt2ETHAddress(note.token),
    }], {
      gasLimit: 1500000,
    });

    const newBalance = await testERC20.balanceOf(
      (await ethers.getSigners())[0].address,
    );

    expect(BigInt(initialBalance) - BigInt(newBalance)).to.equal(note.amount);

    merkleTree.insertLeaves([note.hash]);

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    const proof = await prover.generateProof({
      merkleTree,
      notes: [
        note,
      ],
      spendingKeys: [
        railgunAccount.privateKey,
      ],
      withdrawAmount: note.amount,
      outputEthAddress: (await ethers.getSigners())[0].address,
    });

    expect(await prover.verifyProof(proof)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof.proof.solidity,
        // Shared
        adaptIDcontract: proof.publicInputs.adaptID.address,
        adaptIDparameters: proof.publicInputs.adaptID.parameters,
        depositAmount: proof.publicInputs.depositAmount,
        withdrawAmount: proof.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof.publicInputs.outputTokenField,
        outputEthAddress: proof.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof.publicInputs.treeNumber,
        merkleRoot: proof.publicInputs.merkleRoot,
        nullifiers: proof.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    expect(await testERC20.balanceOf((await ethers.getSigners())[0].address))
      .to.equal(initialBalance);
  });

  it('Should do batch transactions', async () => {
    const merkleTree = new MerkleTree();

    const outputNote1a = Note.generateNote(railgunAccount.publicKey, 100n, testERC20.address);
    const outputNote1b = Note.generateNote(railgunAccount.publicKey, 50n, testERC20.address);

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    const proof = await prover.generateProof({
      merkleTree,
      depositAmount: 150n,
      outputs: [
        outputNote1a,
        outputNote1b,
      ],
    });

    expect(await prover.verifyProof(proof)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof.proof.solidity,
        // Shared
        adaptIDcontract: proof.publicInputs.adaptID.address,
        adaptIDparameters: proof.publicInputs.adaptID.parameters,
        depositAmount: proof.publicInputs.depositAmount,
        withdrawAmount: proof.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof.publicInputs.outputTokenField,
        outputEthAddress: proof.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof.publicInputs.treeNumber,
        merkleRoot: proof.publicInputs.merkleRoot,
        nullifiers: proof.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    merkleTree.insertLeaves(proof.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    const outputNote2a = Note.generateNote(railgunAccount.publicKey, 100n, testERC20.address);
    const outputNote2b = Note.generateNote(railgunAccount.publicKey, 50n, testERC20.address);

    const proof2 = await prover.generateProof({
      merkleTree,
      notes: [
        outputNote1a,
      ],
      spendingKeys: [
        railgunAccount.privateKey,
      ],
      outputs: [
        outputNote2a,
      ],
    });

    const proof3 = await prover.generateProof({
      merkleTree,
      notes: [
        outputNote1b,
      ],
      spendingKeys: [
        railgunAccount.privateKey,
      ],
      outputs: [
        outputNote2b,
      ],
    });

    expect(await prover.verifyProof(proof2)).to.equal(true);
    expect(await prover.verifyProof(proof3)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof2.proof.solidity,
        // Shared
        adaptIDcontract: proof2.publicInputs.adaptID.address,
        adaptIDparameters: proof2.publicInputs.adaptID.parameters,
        depositAmount: proof2.publicInputs.depositAmount,
        withdrawAmount: proof2.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof2.publicInputs.outputTokenField,
        outputEthAddress: proof2.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof2.publicInputs.treeNumber,
        merkleRoot: proof2.publicInputs.merkleRoot,
        nullifiers: proof2.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof2.publicInputs.commitments,
      }, {
        // Proof
        proof: proof3.proof.solidity,
        // Shared
        adaptIDcontract: proof3.publicInputs.adaptID.address,
        adaptIDparameters: proof3.publicInputs.adaptID.parameters,
        depositAmount: proof3.publicInputs.depositAmount,
        withdrawAmount: proof3.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof3.publicInputs.outputTokenField,
        outputEthAddress: proof3.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof3.publicInputs.treeNumber,
        merkleRoot: proof3.publicInputs.merkleRoot,
        nullifiers: proof3.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof3.publicInputs.commitments,
      }],
      {
        gasLimit: 3000000,
      },
    );

    merkleTree.insertLeaves(proof2.publicInputs.commitments.map((commitment) => commitment.hash));
    merkleTree.insertLeaves(proof3.publicInputs.commitments.map((commitment) => commitment.hash));

    expect(
      (await railgunLogic.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );
  });

  it('Should calculate fees', async () => {
    await railgunLogic.changeFee(25n, 25n, 0n);

    const vectors = [
      {
        base: 10000n,
        fee: 25n,
        total: 10025n,
      },
      {
        base: 10226000n,
        fee: 25565n,
        total: 10251565n,
      },
      {
        base: 4800n,
        fee: 12n,
        total: 4812n,
      },
    ];

    await Promise.all(vectors.map(async (vector) => {
      const result = await railgunLogic.getBaseAndFee(vector.base, false);
      expect(result[0]).to.equal(vector.base);
      expect(result[1]).to.equal(vector.fee);

      const result2 = await railgunLogic.getBaseAndFee(vector.total, true);
      expect(result2[0]).to.equal(vector.base);
      expect(result2[1]).to.equal(vector.fee);
    }));
  });

  it('Should collect treasury fees', async () => {
    await railgunLogic.changeFee(25n, 25n, 0n);

    const merkleTree = new MerkleTree();

    const note = Note.generateNote(railgunAccount.publicKey, 1000000n, testERC20.address);

    const proof = await prover.generateProof({
      merkleTree,
      depositAmount: 1000000n,
      outputs: [
        note,
      ],
    });

    merkleTree.insertLeaves(proof.publicInputs.commitments.map((commitment) => commitment.hash));

    await testERC20.approve(railgunLogic.address, 2n ** 256n - 1n);

    expect(await prover.verifyProof(proof)).to.equal(true);

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof.proof.solidity,
        // Shared
        adaptIDcontract: proof.publicInputs.adaptID.address,
        adaptIDparameters: proof.publicInputs.adaptID.parameters,
        depositAmount: proof.publicInputs.depositAmount,
        withdrawAmount: proof.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof.publicInputs.outputTokenField,
        outputEthAddress: proof.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof.publicInputs.treeNumber,
        merkleRoot: proof.publicInputs.merkleRoot,
        nullifiers: proof.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    expect(
      await testERC20.balanceOf((await ethers.getSigners())[1].address),
    ).to.equal(2500n);

    expect(
      await testERC20.balanceOf(await railgunLogic.address),
    ).to.equal(1000000n);

    const proof2 = await prover.generateProof({
      merkleTree,
      withdrawAmount: 1000000n,
      outputEthAddress: (await ethers.getSigners())[0].address,
      spendingKeys: [
        railgunAccount.privateKey,
      ],
      notes: [
        note,
      ],
    });

    await railgunLogic.transact(
      [{
        // Proof
        proof: proof2.proof.solidity,
        // Shared
        adaptIDcontract: proof2.publicInputs.adaptID.address,
        adaptIDparameters: proof2.publicInputs.adaptID.parameters,
        depositAmount: proof2.publicInputs.depositAmount,
        withdrawAmount: proof2.publicInputs.withdrawAmount,
        tokenType: 0n,
        tokenSubID: 0n,
        tokenField: proof2.publicInputs.outputTokenField,
        outputEthAddress: proof2.publicInputs.outputEthAddress,
        // Join
        treeNumber: proof2.publicInputs.treeNumber,
        merkleRoot: proof2.publicInputs.merkleRoot,
        nullifiers: proof2.publicInputs.nullifiers,
        // Split
        commitmentsOut: proof2.publicInputs.commitments,
      }],
      {
        gasLimit: 1500000,
      },
    );

    expect(
      await testERC20.balanceOf((await ethers.getSigners())[1].address),
    ).to.equal(4994n);

    expect(
      await testERC20.balanceOf(await railgunLogic.address),
    ).to.equal(0n);

    await railgunLogic.generateDeposit([{
      pubkey: utils.unpackPoint(railgunAccount.publicKey),
      random: note.random,
      amount: note.amount,
      tokenType: 0n,
      tokenSubID: 0n,
      token: utils.bigInt2ETHAddress(note.token),
    }], {
      gasLimit: 1500000,
    });

    expect(
      await testERC20.balanceOf((await ethers.getSigners())[1].address),
    ).to.equal(7494n);

    expect(
      await testERC20.balanceOf(await railgunLogic.address),
    ).to.equal(1000000n);
  });
});
