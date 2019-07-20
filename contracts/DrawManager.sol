pragma solidity ^0.5.0;

import "kleros/contracts/data-structures/SortitionSumTreeFactory.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";

library DrawManager {
    using SortitionSumTreeFactory for SortitionSumTreeFactory.SortitionSumTrees;
    using SafeMath for uint256;

    bytes32 public constant TREE_OF_DRAWS = "TreeOfDraws";

    struct Draw {
        uint256 index;
        uint256 total;
    }

    struct DrawState {
        SortitionSumTreeFactory.SortitionSumTrees sortitionSumTrees;
        mapping(address => uint256) usersFirstDrawIndex;
        mapping(address => uint256) usersSecondDrawIndex;
        mapping(uint256 => Draw) draws;
        uint256 currentDrawIndex;
        uint256 eligibleSupply;
    }

    /**
     * @dev Creates the next draw.  Does not add it to the sortition sum trees (yet)
     */
    function openNextDraw(DrawState storage drawState) public {
        // If there is no previous draw, we must initialize
        if (drawState.currentDrawIndex == 0) {
            drawState.sortitionSumTrees.createTree(TREE_OF_DRAWS, 4);
        } else { // else add current draw to sortition sum trees
            Draw storage draw = drawState.draws[drawState.currentDrawIndex];
            drawState.sortitionSumTrees.set(TREE_OF_DRAWS, draw.total, bytes32(draw.index));
            drawState.eligibleSupply = drawState.eligibleSupply.add(draw.total);
        }
        // now create a new draw
        uint256 drawIndex = drawState.currentDrawIndex.add(1);
        drawState.sortitionSumTrees.createTree(bytes32(drawIndex), 4);
        drawState.currentDrawIndex = drawIndex;
        drawState.draws[drawIndex] = Draw(
            drawIndex,
            0
        );
    }

    function deposit(DrawState storage drawState, address user, uint256 amount) public requireOpenDraw(drawState) {
        bytes32 userId = bytes32(uint256(user));
        uint256 currentDrawIndex = drawState.currentDrawIndex;

        // update the current draw
        uint256 currentAmount = drawState.sortitionSumTrees.stakeOf(bytes32(currentDrawIndex), userId);
        currentAmount = currentAmount.add(amount);
        drawSet(drawState, currentDrawIndex, currentAmount, user);

        uint256 firstDrawIndex = drawState.usersFirstDrawIndex[user];
        uint256 secondDrawIndex = drawState.usersSecondDrawIndex[user];

        // if this is the users first draw, set it
        if (firstDrawIndex == 0) {
            drawState.usersFirstDrawIndex[user] = currentDrawIndex;
        // otherwise, if the first draw is not this draw
        } else if (firstDrawIndex != currentDrawIndex) {
            // if a second draw does not exist
            if (secondDrawIndex == 0) {
                // set the second draw to the current draw
                drawState.usersSecondDrawIndex[user] = currentDrawIndex;
            // otherwise if a second draw exists but is not the current one
            } else if (secondDrawIndex != currentDrawIndex) {
                // merge it into the first draw, and update the second draw index to this one
                uint256 firstAmount = drawState.sortitionSumTrees.stakeOf(bytes32(firstDrawIndex), userId);
                uint256 secondAmount = drawState.sortitionSumTrees.stakeOf(bytes32(secondDrawIndex), userId);
                drawSet(drawState, firstDrawIndex, firstAmount.add(secondAmount), user);
                drawSet(drawState, secondDrawIndex, 0, user);
                drawState.usersSecondDrawIndex[user] = currentDrawIndex;
            }
        }
    }

    function withdraw(DrawState storage drawState, address user, uint256 amount) public requireOpenDraw(drawState) {
        bytes32 userId = bytes32(uint256(user));
        uint256 firstDrawIndex = drawState.usersFirstDrawIndex[user];
        uint256 secondDrawIndex = drawState.usersSecondDrawIndex[user];

        uint256 firstAmount = drawState.sortitionSumTrees.stakeOf(bytes32(firstDrawIndex), userId);
        uint256 secondAmount = drawState.sortitionSumTrees.stakeOf(bytes32(secondDrawIndex), userId);

        uint256 total = firstAmount.add(secondAmount);

        require(amount <= total, "cannot withdraw more than available");

        uint256 remaining = total.sub(amount);

        // if we can simply eliminate the second amount
        if (remaining < firstAmount) {
            drawSet(drawState, firstDrawIndex, remaining, user);
            if (secondDrawIndex != 0) {
                drawSet(drawState, secondDrawIndex, 0, user);
            }
        } else {
            uint256 secondRemaining = remaining.sub(firstAmount);
            drawSet(drawState, secondDrawIndex, secondRemaining, user);
        }
    }

    function balanceOf(DrawState storage drawState, address user) public view returns (uint256) {
        return eligibleBalanceOf(drawState, user).add(openBalanceOf(drawState, user));
    }

    function eligibleBalanceOf(DrawState storage drawState, address user) public view returns (uint256) {
        uint256 balance = 0;

        uint256 firstDrawIndex = drawState.usersFirstDrawIndex[user];
        uint256 secondDrawIndex = drawState.usersSecondDrawIndex[user];

        if (firstDrawIndex != 0 && firstDrawIndex != drawState.currentDrawIndex) {
            balance = balance.add(drawState.sortitionSumTrees.stakeOf(bytes32(firstDrawIndex), bytes32(uint256(user))));
        }

        if (secondDrawIndex != 0 && secondDrawIndex != drawState.currentDrawIndex) {
            balance = balance.add(drawState.sortitionSumTrees.stakeOf(bytes32(secondDrawIndex), bytes32(uint256(user))));
        }

        return balance;
    }

    function openBalanceOf(DrawState storage drawState, address user) public view returns (uint256) {
        if (drawState.currentDrawIndex == 0) {
            return 0;
        } else {
            return drawState.sortitionSumTrees.stakeOf(bytes32(drawState.currentDrawIndex), bytes32(uint256(user)));
        }
    }

    function openSupply(DrawState storage drawState) public view returns (uint256) {
        if (drawState.currentDrawIndex > 0) {
            return drawState.draws[drawState.currentDrawIndex].total;
        } else {
            return 0;
        }
    }

    /**
     * Draws a winner from the previous draws
     */
    function getDraw(DrawState storage drawState, uint256 index) public view returns (uint256) {
        return drawState.draws[index].total;
    }

    function drawSet(DrawState storage drawState, uint256 drawIndex, uint256 amount, address user) internal {
        bytes32 drawId = bytes32(drawIndex);
        bytes32 userId = bytes32(uint256(user));
        uint256 oldAmount = drawState.sortitionSumTrees.stakeOf(drawId, userId);
        if (oldAmount != amount) {
            drawState.sortitionSumTrees.set(drawId, amount, userId);
            Draw storage draw = drawState.draws[drawIndex];
            if (oldAmount > amount) {
                uint256 diffAmount = oldAmount.sub(amount);
                draw.total = draw.total.sub(diffAmount);
                if (drawIndex != drawState.currentDrawIndex) {
                    drawState.sortitionSumTrees.set(TREE_OF_DRAWS, draw.total, drawId);
                    drawState.eligibleSupply = drawState.eligibleSupply.sub(diffAmount);
                }
            } else { // oldAmount < amount
                uint256 diffAmount = amount.sub(oldAmount);
                draw.total = draw.total.add(diffAmount);
                if (drawIndex != drawState.currentDrawIndex) {
                    drawState.sortitionSumTrees.set(TREE_OF_DRAWS, draw.total, drawId);
                    drawState.eligibleSupply = drawState.eligibleSupply.add(diffAmount);
                }
            }
        }
    }

    function draw(DrawState storage drawState, uint256 token) public view returns (address) {
        require(token < drawState.eligibleSupply, "token is beyond the eligible supply");
        uint256 drawIndex = uint256(drawState.sortitionSumTrees.draw(TREE_OF_DRAWS, token));
        uint256 drawToken = token % drawState.draws[drawIndex].total;
        return address(uint256(drawState.sortitionSumTrees.draw(bytes32(drawIndex), drawToken)));
    }

    modifier requireOpenDraw(DrawState storage drawState) {
        require(drawState.currentDrawIndex > 0, "there is no open draw");
        _;
    }
}