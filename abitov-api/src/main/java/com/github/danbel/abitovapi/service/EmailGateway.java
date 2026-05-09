package com.github.danbel.abitovapi.service;

public interface EmailGateway {

    void send(String to, String subject, String body);
}
