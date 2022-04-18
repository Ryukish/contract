/* eslint-disable no-param-reassign */
const { extendEnvironment } = require('hardhat/config');

extendEnvironment((hre) => {
  /**
   * Overwrites bytecode of existing artifact
   *
   * @param {string} contractName - contract to overwrite
   * @param {string} bytecode - bytecode to overwrite with
   */
  hre.overwriteArtifact = async (contractName, bytecode) => {
    const artifact = await hre.artifacts.readArtifact(contractName);

    await hre.artifacts.saveArtifactAndDebugFile({
      ...artifact,
      bytecode,
    });
  };

  /**
   * Creates artifact by cloning existing artifact
   *
   * @param {string} templateContract - contract to clone
   * @param {string} generatedContract - name of new contract
   * @param {string} bytecode - bytecode of new contract
   */
  hre.createArtifactFromTemplate = async (
    templateContract,
    generatedContract,
    bytecode,
  ) => {
    const primaryArtifact = await hre.artifacts.readArtifact(templateContract);

    await hre.artifacts.saveArtifactAndDebugFile({
      ...primaryArtifact,
      sourceName: 'Artifactor',
      contractName: generatedContract,
      bytecode,
    });
  };

  /**
   * Creates new artifact with abi and bytecode
   *
   * @param {string} contractName - contract to overwrite
   * @param {object} abi - contract abi
   * @param {string} bytecode - bytecode to overwrite with
   */
  hre.createArtifact = async (contractName, abi, bytecode) => {
    await hre.artifacts.saveArtifactAndDebugFile({
      _format: 'hh-sol-artifact-1',
      contractName,
      sourceName: 'Artifactor',
      abi,
      bytecode,
      deployedBytecode: '',
      linkReferences: {},
      deployedLinkReferences: {},
    });
  };
});
