import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isDateNotInPast', async: false })
export class IsDateNotInPastConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    const inputDate = new Date(propertyValue);
    inputDate.setHours(0, 0, 0, 0);

    return inputDate.getTime() >= today.getTime();
  }

  defaultMessage() {
    return 'Booking date cannot be in the past';
  }
}

export function IsDateNotInPast(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDateNotInPastConstraint,
    });
  };
}
