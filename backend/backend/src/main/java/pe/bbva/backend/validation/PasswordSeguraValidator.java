package pe.bbva.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordSeguraValidator implements ConstraintValidator<PasswordSegura, String> {

    public static boolean esSegura(String valor) {
        return valor != null
                && valor.length() >= 8
                && valor.chars().anyMatch(Character::isUpperCase)
                && valor.chars().anyMatch(Character::isLowerCase)
                && valor.chars().anyMatch(Character::isDigit);
    }

    @Override
    public boolean isValid(String valor, ConstraintValidatorContext context) {
        return esSegura(valor);
    }
}
