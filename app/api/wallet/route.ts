import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chain = searchParams.get('chain');
  const address = searchParams.get('address');
  if (!chain || !address) {
    return NextResponse.json(
      { error: 'Missing chain or address parameter' },
      { status: 400 }
    );
  }
  try {
    const chainsRes = await fetch(`${request.nextUrl.origin}/api/chains`);
    const chains = await chainsRes.json();
    const selectedChain = chains.find(
      (c: any) => c.chain_name.toLowerCase().replace(/\s+/g, '-') === chain.toLowerCase()
    );
    if (!selectedChain || !selectedChain.api || selectedChain.api.length === 0) {
      return NextResponse.json(
        { error: 'Chain not found or no API available' },
        { status: 404 }
      );
    }
    const apiUrl = selectedChain.api[0].address;
    let validatorAddress = '';
    let isValidator = false;
    try {
      const prefix = selectedChain.addr_prefix || 'cosmos';
      const valPrefix = `${prefix}valoper`;
      if (address.startsWith(prefix) && !address.startsWith(valPrefix)) {
        validatorAddress = address.replace(new RegExp(`^${prefix}`), valPrefix);
        const valCheckRes = await fetch(
          `${apiUrl}/cosmos/staking/v1beta1/validators/${validatorAddress}`
        ).catch(() => null);
        if (valCheckRes && valCheckRes.ok) {
          isValidator = true;
        }
      }
    } catch (err) {
    }
    const balancesPromise = fetch(
      `${apiUrl}/cosmos/bank/v1beta1/balances/${address}`
    ).then(r => r.json()).catch(() => ({ balances: [] }));
    const delegationsPromise = fetch(
      `${apiUrl}/cosmos/staking/v1beta1/delegations/${address}`
    ).then(r => r.json()).catch(() => ({ delegation_responses: [] }));
    const rewardsPromise = fetch(
      `${apiUrl}/cosmos/distribution/v1beta1/delegators/${address}/rewards`
    ).then(r => r.json()).catch(() => ({ rewards: [], total: [] }));
    const unbondingPromise = fetch(
      `${apiUrl}/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`
    ).then(r => r.json()).catch(() => ({ unbonding_responses: [] }));
    const commissionPromise = isValidator
      ? fetch(
          `${apiUrl}/cosmos/distribution/v1beta1/validators/${validatorAddress}/commission`
        ).then(r => r.json()).catch(() => ({ commission: { commission: [] } }))
      : Promise.resolve(null);
    const [balancesData, delegationsData, rewardsData, unbondingData, commissionData] = await Promise.all([
      balancesPromise,
      delegationsPromise,
      rewardsPromise,
      unbondingPromise,
      commissionPromise,
    ]);
    const validatorAddresses = (delegationsData.delegation_responses || [])
      .map((del: any) => del.delegation?.validator_address)
      .filter(Boolean);
    const validatorsInfo: any = {};
    if (validatorAddresses.length > 0) {
      try {
        const validatorsRes = await fetch(
          `${apiUrl}/cosmos/staking/v1beta1/validators?pagination.limit=500&status=BOND_STATUS_BONDED`
        );
        const validatorsData = await validatorsRes.json();
        (validatorsData.validators || []).forEach((val: any) => {
          validatorsInfo[val.operator_address] = {
            moniker: val.description?.moniker || 'Unknown',
            identity: val.description?.identity || '',
            operatorAddress: val.operator_address,
          };
        });
      } catch (err) {
      }
      const missingValidators = validatorAddresses.filter(
        (addr: string) => !validatorsInfo[addr]
      );
      if (missingValidators.length > 0) {
        const individualFetches = missingValidators.map(async (valAddr: string) => {
          try {
            const valRes = await fetch(
              `${apiUrl}/cosmos/staking/v1beta1/validators/${valAddr}`
            );
            const valData = await valRes.json();
            if (valData.validator) {
              validatorsInfo[valAddr] = {
                moniker: valData.validator.description?.moniker || 'Unknown',
                identity: valData.validator.description?.identity || '',
                operatorAddress: valAddr,
              };
            }
          } catch (err) {
            validatorsInfo[valAddr] = {
              moniker: 'Unknown',
              identity: '',
              operatorAddress: valAddr,
            };
          }
        });
        await Promise.all(individualFetches);
      }
    }
    const balances = balancesData.balances || [];
    const delegations = (delegationsData.delegation_responses || []).map((del: any) => {
      const validatorAddress = del.delegation?.validator_address || '';
      return {
        validator: validatorAddress,
        amount: del.balance?.amount || '0',
        denom: del.balance?.denom || '',
        validatorInfo: validatorsInfo[validatorAddress] || null,
      };
    });
    const rewards = (rewardsData.rewards || []).map((rew: any) => {
      const totalReward = (rew.reward || []).reduce((sum: number, r: any) => {
        return sum + parseFloat(r.amount || '0');
      }, 0);
      return {
        validator: rew.validator_address,
        amount: Math.floor(totalReward).toString(),
      };
    });
    const totalRewards = rewardsData.total || [];
    let commission = null;
    if (isValidator && commissionData) {
      const commissionArray = commissionData.commission?.commission || [];
      const totalCommission = commissionArray.reduce((sum: number, c: any) => {
        return sum + parseFloat(c.amount || '0');
      }, 0);
      commission = {
        total: Math.floor(totalCommission).toString(),
        breakdown: commissionArray,
      };
    }
    return NextResponse.json({
      address,
      isValidator,
      validatorAddress: isValidator ? validatorAddress : null,
      balances,
      delegations,
      rewards,
      totalRewards,
      unbonding: unbondingData.unbonding_responses || [],
      commission,
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch wallet data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
