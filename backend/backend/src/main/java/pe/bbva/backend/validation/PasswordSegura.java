package pe.bbva.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número. */
@Documented
@Constraint(validatedBy = PasswordSeguraValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface PasswordSegura {

    String message() default "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
