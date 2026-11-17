
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { FormField } from "../components/FormField";
import { PrimaryButton } from "../components/PrimaryButton";

import { updateProfile } from "../services/userService";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../store/hooks";
import { showMessage } from "../utils/dialog";
import { validatePhone, validateRequired } from "../utils/validators";
import { RootScreenProps } from "../navigation/types";
import { colors } from "../theme";

export function EditProfileScreen({
  navigation,
}: RootScreenProps<"EditProfile">) {
  const { user, patchUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Kiểm tra dữ liệu nhập
  const errors = {
    name: validateRequired("họ tên")(name),
    phone: validatePhone(phone),
  };

  const save = async () => {
    setTouched(true);

    // Không gửi API nếu dữ liệu không hợp lệ
    if (errors.name || errors.phone || !user) {
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      // Gửi PATCH lên server
      const updated = await updateProfile(user.id, {
        name: name.trim(),
        phone: phone.trim(),
      });

      // Cập nhật Redux Store
      patchUser(updated);

      showMessage(
        "Đã lưu",
        "Thông tin hồ sơ của bạn đã được cập nhật.",
        () => navigation.goBack()
      );
    } catch (e) {
      setSubmitError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <FormField
        label="Email (không thể đổi)"
        value={user?.email ?? ""}
        editable={false}
        style={styles.disabledInput}
      />

      <FormField
        label="Họ tên"
        value={name}
        onChangeText={setName}
        error={touched ? errors.name : null}
        placeholder="Nhập họ và tên"
        autoCapitalize="words"
      />

      <FormField
        label="Số điện thoại"
        value={phone}
        onChangeText={setPhone}
        error={touched ? errors.phone : null}
        placeholder="Nhập số điện thoại"
        keyboardType="phone-pad"
      />

      {submitError ? (
        <Text style={styles.error}>{submitError}</Text>
      ) : null}

      <PrimaryButton
        title="Lưu thay đổi"
        onPress={save}
        loading={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  disabledInput: {
    opacity: 0.6,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
  },
});
