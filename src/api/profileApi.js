import { api } from "./client";

export const profileApi = {
  updateProfile: async (payload) => {
    const formData = new FormData();

    formData.append("fullName", payload.fullName);
    formData.append("mobileNumber", payload.mobileNumber);
    formData.append("dateOfBirth", payload.dateOfBirth);

    if (
      payload.preferredVenueId !== undefined &&
      payload.preferredVenueId !== null &&
      payload.preferredVenueId !== ""
    ) {
      formData.append("preferredVenueId", String(payload.preferredVenueId));
    }

    if (payload.avatar instanceof File) {
      formData.append("avatar", payload.avatar);
    }

    const { data } = await api.put("/profile", formData, {
      headers: {
        "Content-Type": undefined,
      },
    });

    return data;
  },
};
