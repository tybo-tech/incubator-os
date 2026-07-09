<?php
declare(strict_types=1);

final class UpdateProfile
{
    public function __construct(
        private CompanyRepository $companyRepo,
        private TransactionManager $tx,
    ) {}

    public function execute(int $companyId, UpdateProfileRequest $input): CommandResult
    {
        return $this->tx->execute(function () use ($companyId, $input) {
            $existing = $this->companyRepo->getById($companyId);
            if (!$existing) {
                throw new InvalidArgumentException("Company not found: $companyId");
            }

            $patch = [];
            if ($input->name !== null) $patch['name'] = $input->name;
            if ($input->registrationNo !== null) $patch['registration_no'] = $input->registrationNo;
            if ($input->tradingName !== null) $patch['trading_name'] = $input->tradingName;
            if ($input->contactPerson !== null) $patch['contact_person'] = $input->contactPerson;
            if ($input->contactNumber !== null) $patch['contact_number'] = $input->contactNumber;
            if ($input->emailAddress !== null) $patch['email_address'] = $input->emailAddress;
            if ($input->city !== null) $patch['city'] = $input->city;
            if ($input->suburb !== null) $patch['suburb'] = $input->suburb;
            if ($input->address !== null) $patch['address'] = $input->address;
            if ($input->businessLocation !== null) $patch['business_location'] = $input->businessLocation;
            if ($input->serviceOffering !== null) $patch['service_offering'] = $input->serviceOffering;
            if ($input->bbbeeLevel !== null) $patch['bbbee_level'] = $input->bbbeeLevel;
            if ($input->industryId !== null) $patch['industry_id'] = (int)$input->industryId;

            $updated = $this->companyRepo->update($companyId, $patch);

            return new CommandResult(
                success: true,
                message: 'Company profile updated',
                data: $updated,
            );
        });
    }
}