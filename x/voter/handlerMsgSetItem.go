package voter

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/EG-easy/voter/x/voter/types"
	"github.com/EG-easy/voter/x/voter/keeper"
)

func handleMsgSetItem(ctx sdk.Context, k keeper.Keeper, msg types.MsgSetItem) (*sdk.Result, error) {
	var item = types.Item{
		Creator: msg.Creator,
		ID:      msg.ID,
    	Denom: msg.Denom,
    	NftId: msg.NftId,
    	Price: msg.Price,
    	Affiliate: msg.Affiliate,
    	InSale: msg.InSale,
	}
	if !msg.Creator.Equals(k.GetItemOwner(ctx, msg.ID)) { // Checks if the the msg sender is the same as the current owner
		return nil, sdkerrors.Wrap(sdkerrors.ErrUnauthorized, "Incorrect Owner") // If not, throw an error
	}

	k.SetItem(ctx, item)

	return &sdk.Result{Events: ctx.EventManager().Events()}, nil
}
