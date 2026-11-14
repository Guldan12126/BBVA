package pe.bbva.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class DniValidator implements ConstraintValidator<Dni, String> {

    @Override
    public boolean isValid(String valor, ConstraintValidatorContext context) {
        return valor != null && valor.matches("\\d{8}");
    }
}
