# Pro THB: ฿699.00 / month
stripe prices create \
  -d "currency=thb" \
  -d "unit_amount=69900" \
  -d "recurring[interval]=month" \
  -d "product=plan_pro" \
  -d "nickname=Pro Monthly THB" \
  -d "lookup_key=pro_monthly_thb" \
  -d "metadata[tier]=pro" \
  -d "metadata[billing_period]=monthly" \
  -d "metadata[currency]=thb"

# Team THB: ฿1,699.00 / month
stripe prices create \
  -d "currency=thb" \
  -d "unit_amount=169900" \
  -d "recurring[interval]=month" \
  -d "product=plan_team" \
  -d "nickname=Team Monthly THB" \
  -d "lookup_key=team_monthly_thb" \
  -d "metadata[tier]=team" \
  -d "metadata[billing_period]=monthly" \
  -d "metadata[currency]=thb"