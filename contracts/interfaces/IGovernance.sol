// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGovernable
 * @dev Interface for governance systems
 */
interface IGovernable {
    function proposalCount() external view returns (uint256);
    function getProposalState(uint256 proposalId) external view returns (uint8);
}

/**
 * @title IVotable
 * @dev Interface for voting mechanisms
 */
interface IVotable {
    function castVote(uint256 proposalId, uint8 voteType) external;
    function getVotingPower(address account) external view returns (uint256);
}

/**
 * @title ITreasuryManagement
 * @dev Interface for treasury operations
 */
interface ITreasuryManagement {
    function depositToTreasury(uint8 category) external payable;
    function getTotalTreasuryBalance() external view returns (uint256);
}
